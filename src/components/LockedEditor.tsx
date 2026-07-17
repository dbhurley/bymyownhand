'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { KeystrokeEvent, WritingSession } from '@/lib/types';
import { calculateMetrics, calculateIntegrityScore, countWords, formatDuration } from '@/lib/metrics';
import { clearDraft, DRAFT_STORAGE_KEY, type DraftSnapshot } from '@/lib/draft';
import { nanoid } from 'nanoid';

interface LockedEditorProps {
  // Resolves `true` once the session is actually certified, `false` if the
  // submission failed. The editor keeps autosaving — and keeps the writer's
  // localStorage draft — until it hears a definite `true`.
  onComplete: (session: WritingSession) => Promise<boolean>;
  title: string;
  onTitleChange: (title: string) => void;
  initialDraft?: DraftSnapshot | null;
  // Parent's POST /api/documents in flight. Disables the Complete button so a
  // rapid double-click can't fire two onComplete calls — which used to produce
  // two verification hashes for the same writing session and race on the
  // /success/<hash> redirect (sessionStorage.lastSession pointed at one hash,
  // URL bar showed the other, success page's hash-match check then bounced
  // the writer to /verify). When the parent's submission errors out, it
  // resets isSubmitting and the writer can retry.
  isSubmitting?: boolean;
}

export default function LockedEditor({ onComplete, title, onTitleChange, initialDraft, isSubmitting = false }: LockedEditorProps) {
  const [content, setContent] = useState(initialDraft?.content ?? '');
  const [wordCount, setWordCount] = useState(0);
  const [sessionId] = useState(() => initialDraft?.sessionId ?? nanoid());
  // Rebase the session's logical start when resuming a draft so the wall-clock
  // gap between the last saved event and the first resumed keystroke doesn't
  // count as a multi-hour "pause." Keystroke events use `t = Date.now() - startTime`,
  // so anchoring `startTime` at `Date.now() - lastEventT - 1ms` makes the first
  // resumed event land 1ms after the last saved one — preserving the writing
  // session as one continuous trace. Without this, a draft resumed 23h later
  // inflated `avgKeystrokeInterval` by ~80M ms, added a bogus pause to
  // `pauseCount`, and the elapsed-time display showed "23h" instead of the
  // actual writing time. The original `startedAt` is preserved separately so
  // the certified record still reports the real wall-clock start.
  const [startTime] = useState(() => {
    if (!initialDraft) return Date.now();
    const lastEventT = initialDraft.events.reduce<number>((max, ev) => ev.t > max ? ev.t : max, 0);
    return Date.now() - lastEventT - 1;
  });
  const [startedAt] = useState(() => initialDraft?.startTime ?? Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [blockedPasteCount, setBlockedPasteCount] = useState(() => initialDraft?.blockedPasteCount ?? 0);

  const eventsRef = useRef<KeystrokeEvent[]>(initialDraft?.events ?? []);
  const internalClipboard = useRef<string>('');
  // Type the editor ref from the OnMount callback's own first parameter rather
  // than `any`, so the ref reflects the real Monaco editor instance type without
  // pulling in a direct `monaco-editor` import.
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Calculate word count
  useEffect(() => {
    setWordCount(countWords(content));
  }, [content]);

  const recordEvent = useCallback((event: Omit<KeystrokeEvent, 't'>) => {
    const t = Date.now() - startTime;
    eventsRef.current.push({ ...event, t });
  }, [startTime]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Block external paste - intercept clipboard
    editor.onKeyDown((e) => {
      // Handle paste attempt (Cmd+V / Ctrl+V)
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyV') {
        e.preventDefault();
        e.stopPropagation();

        // Check if we have internal clipboard content
        if (internalClipboard.current) {
          // Allow internal paste
          const selection = editor.getSelection();
          if (selection) {
            editor.executeEdits('internal-paste', [{
              range: selection,
              text: internalClipboard.current,
            }]);
            recordEvent({
              type: 'paste_internal',
              pos: selection.startColumn,
              len: internalClipboard.current.length,
            });
          }
        } else {
          // Block external paste
          setBlockedPasteCount(prev => prev + 1);
          recordEvent({
            type: 'paste_blocked',
            pos: editor.getPosition()?.column || 0,
          });
        }
        return;
      }

      // Handle copy (Cmd+C / Ctrl+C) - store in internal clipboard
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyC') {
        const selection = editor.getSelection();
        if (selection) {
          const selectedText = editor.getModel()?.getValueInRange(selection) || '';
          internalClipboard.current = selectedText;
        }
        // Allow default copy behavior for accessibility
        return;
      }

      // Handle cut (Cmd+X / Ctrl+X)
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyX') {
        const selection = editor.getSelection();
        if (selection) {
          const selectedText = editor.getModel()?.getValueInRange(selection) || '';
          internalClipboard.current = selectedText;
        }
        // Allow default cut behavior
        return;
      }
    });

    // Record keystrokes
    editor.onKeyUp((e) => {
      const pos = editor.getPosition()?.column || 0;

      // Skip modifier keys
      if (['Meta', 'Control', 'Alt', 'Shift', 'CapsLock'].includes(e.code)) {
        return;
      }

      // Check if it's a deletion. Checked before the command-combo guard below
      // so a Cmd/Ctrl+Backspace (delete-word/delete-to-line-start) still counts
      // as the deletion it is.
      if (e.code === 'Backspace' || e.code === 'Delete') {
        recordEvent({
          type: 'delete',
          key: e.code,
          pos,
        });
        return;
      }

      // Skip command-shortcut keyups. The onKeyDown handler already processes
      // Cmd/Ctrl+V (paste), +C (copy), and +X (cut), but it can't suppress the
      // *keyup* for those combos — and any other shortcut (Cmd/Ctrl+A select-all,
      // +Z undo, +S save) fires a keyup too. With no modifier guard here, each of
      // those landed in the trace as a phantom `key` event: a blocked paste
      // recorded both `paste_blocked` *and* a `KeyV` keystroke, an internal paste
      // both `paste_internal` *and* a `KeyV`, and a copy/undo/select-all a bare
      // `KeyC`/`KeyZ`/`KeyA` — none of which typed a character. Those phantoms
      // inflate `longestBurst`, distort `avgKeystrokeInterval`/variance, and nudge
      // playback's cursor past the real content. Skip meta combos (Cmd on macOS,
      // never used for text entry) and ctrl-without-alt combos (a shortcut),
      // while still recording Ctrl+Alt (AltGr) keyups so European-layout
      // characters like € / @ remain captured. Inverse of the §6.20
      // keystroke-coverage fix: that added missing real keys; this drops phantom
      // command-combo keys.
      if (e.metaKey || (e.ctrlKey && !e.altKey)) {
        return;
      }

      // Record regular keystroke. Whitelist any KeyboardEvent.code that
      // produces a printable character or a writing-relevant whitespace key,
      // and explicitly skip navigation/function/lock/media keys. The old
      // whitelist missed Minus/Equal/Slash/Backslash/Backquote/Tab and the
      // entire Numpad family, so hyphens, dates ("5/17/2026"), backticks, and
      // numbers typed on the numeric keypad never made it into the trace —
      // which deflates variance, longestBurst, and pause counts on real
      // human writing.
      if (e.code.startsWith('Key') || e.code.startsWith('Digit') ||
          e.code.startsWith('Numpad') ||
          e.code.startsWith('Bracket') || e.code.startsWith('Quote') ||
          e.code === 'Space' || e.code === 'Enter' || e.code === 'Tab' ||
          e.code === 'Comma' || e.code === 'Period' || e.code === 'Semicolon' ||
          e.code === 'Minus' || e.code === 'Equal' ||
          e.code === 'Slash' || e.code === 'Backslash' ||
          e.code === 'Backquote' || e.code === 'IntlBackslash') {
        recordEvent({
          type: 'key',
          key: e.code,
          pos,
        });
      }
    });

    // Block drag-and-drop
    editor.getDomNode()?.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setBlockedPasteCount(prev => prev + 1);
      recordEvent({
        type: 'paste_blocked',
        pos: editor.getPosition()?.column || 0,
      });
    });

    editor.getDomNode()?.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    setContent(value || '');
  };

  // Auto-save the in-progress draft to localStorage. The full keystroke trace
  // is preserved so a resumed session keeps integrity scoring intact.
  //
  // The persist callback reads from a ref instead of closure state so the
  // 3-second interval can be set up once and tick steadily. Previously the
  // effect's deps included `content`, so each keystroke cleared the interval
  // and started a fresh 3000ms timer — meaning a writer typing continuously
  // would never see an autosave fire until they paused for ≥3s (or closed the
  // tab, which fires `beforeunload`).
  const draftSnapshotRef = useRef({ title, content, blockedPasteCount });
  useEffect(() => {
    draftSnapshotRef.current = { title, content, blockedPasteCount };
  }, [title, content, blockedPasteCount]);

  // Set once the certification is confirmed, at which point the draft has been
  // cleared and must never be written back. A ref, not state: `handleSubmit`
  // sets it and clears the draft in the same synchronous step, so no autosave
  // tick can interleave between the two and resurrect the draft we just
  // deleted. (A state flag would only stop the interval on the *next* render.)
  const draftFinalizedRef = useRef(false);

  // Autosave runs for the whole life of the editor, stopping only when a
  // certification actually succeeds. It used to stop the moment `handleSubmit`
  // fired (an `isRecording` flag it set to false), and `handleSubmit` also
  // deleted the saved draft outright — both *before* the parent's POST
  // /api/documents had succeeded. So a certification that failed (a dropped
  // connection, a 500, the server-side word-count/trace gates) left the writer
  // back in the editor with their localStorage draft already erased *and*
  // autosave permanently off for the rest of the session: from then on,
  // closing the tab lost everything. That is precisely the event Phase 1.1
  // exists to prevent ("an accidental tab-close erases work — that single
  // event kills retention"), and a failed submit is exactly when a writer is
  // most likely to close the tab. Saving now continues across a failure.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const persist = () => {
      if (draftFinalizedRef.current) return;
      const { title: t, content: c, blockedPasteCount: b } = draftSnapshotRef.current;
      if (!c.trim() && !t.trim()) return;
      const snapshot: DraftSnapshot = {
        sessionId,
        title: t,
        content: c,
        events: eventsRef.current,
        // Persist the original wall-clock start so resuming reconstructs the
        // session's true `startedAt`; the rebased `startTime` is a runtime-only
        // offset for keystroke timing math.
        startTime: startedAt,
        blockedPasteCount: b,
        savedAt: Date.now(),
      };
      try {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Quota exceeded or storage disabled — silently skip.
      }
    };

    const interval = window.setInterval(persist, 3000);
    window.addEventListener('beforeunload', persist);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', persist);
    };
  }, [sessionId, startedAt]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Compute the writing window and word count live at submit time rather than
    // reading the React state. `elapsedTime` is refreshed only once per second
    // by the interval, so a writer who hits Complete within the first second
    // (or between ticks) would submit a window truncated by up to ~1s — or 0
    // before the first tick — which deflates the Duration cell, zeroes the WPM
    // stat, and silently skips the >150/>200 WPM penalty in the integrity
    // score. `Date.now() - startTime` is the same source the interval samples,
    // just read at the precise moment of submission. `wordCount` state is
    // likewise effect-synced; recompute from `content` so the certified count
    // can't lag a final keystroke.
    const activeWritingTime = Date.now() - startTime;
    const finalWordCount = countWords(content);

    const metrics = calculateMetrics(eventsRef.current, content);
    const integrityScore = calculateIntegrityScore(metrics, finalWordCount, activeWritingTime);

    const session: WritingSession = {
      id: sessionId,
      // Preserve the original wall-clock start (the moment the writer first
      // opened the editor) so the certified record reflects when the piece
      // actually began. The server recomputes `writingTimeMs` from
      // `(endedAt - startedAt)`, so emit `endedAt = startedAt + activeWritingTime`
      // — yielding the *active* writing window (resume gap excluded) which
      // matches what the keystroke trace and integrity score reflect. Without
      // this, a 23h-old resumed draft would persist a 23h+ writing window and
      // tarnish WPM, the Duration cell, and the certificate PDF.
      startedAt,
      endedAt: startedAt + activeWritingTime,
      events: eventsRef.current,
      metrics,
      content,
      wordCount: finalWordCount,
      integrityScore,
    };

    // Drop the local draft only once the certification is confirmed. Marking it
    // finalized *before* clearing (both synchronous, so nothing can run between
    // them) stops the autosave interval from writing the draft straight back —
    // which would leave the writer facing a "Resume where you left off?" banner
    // for a piece they had just successfully certified.
    if (await onComplete(session)) {
      draftFinalizedRef.current = true;
      clearDraft();
    }
  };

  const progressPercent = Math.min(100, (wordCount / 10) * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between px-5 md:px-8 py-3 md:py-4 border-b border-deep-blue/[0.06] bg-cream gap-3 md:gap-0">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled Document"
            // A `placeholder` is not a reliable accessible name: it disappears
            // once the field has a value and isn't consistently announced as a
            // label. Without `aria-label` this is an unlabeled edit field — the
            // WCAG 2.1 Level A failure the §6.29 fix closed for the /success
            // verification-link input — and it's the first control a writer
            // touches in the editor. Accessibility is an always-on cross-cutting
            // roadmap investment.
            aria-label="Document title"
            className="text-lg font-semibold bg-transparent border-none outline-none text-deep-blue placeholder-deep-blue/25 w-full md:w-72 focus:placeholder-deep-blue/40 transition-colors"
          />
          {/* Driven by the live submission state rather than a one-way flag the
              submit handler flipped and nothing ever flipped back. The pill
              still goes dark while a certification is in flight (unchanged
              visually), but a *failed* certification now relights it — the
              writer really is still recording, since keystroke capture runs off
              the editor's own key handlers and never stopped. */}
          {!isSubmitting && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-deep-blue/40 animate-pulse-recording" />
              <span className="text-xs font-medium text-deep-blue/35 uppercase tracking-wider">Recording</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-5 text-sm text-deep-blue/40">
          <span className="font-mono tabular-nums">{formatDuration(elapsedTime)}</span>
          <span className="w-px h-3.5 bg-deep-blue/10" />
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          {blockedPasteCount > 0 && (
            <>
              <span className="w-px h-3.5 bg-deep-blue/10" />
              <span className="text-deep-blue/50">
                {blockedPasteCount} paste{blockedPasteCount > 1 ? 's' : ''} blocked
              </span>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="plaintext"
          theme="vs-light"
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            wordWrap: 'on',
            lineNumbers: 'off',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 17,
            fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
            lineHeight: 1.9,
            padding: { top: 40, bottom: 40 },
            renderWhitespace: 'none',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'hidden',
              verticalScrollbarSize: 6,
            },
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: 'off',
            contextmenu: false,
          }}
        />

        {/* Paste blocked overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          onPaste={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />

        {/* Empty state hint */}
        {wordCount === 0 && (
          <div className="absolute top-36 left-0 right-0 flex justify-center pointer-events-none">
            <p className="text-deep-blue/20 text-sm">Start typing to begin your session...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-deep-blue/[0.06]">
        {/* Progress toward the 10-word certification gate. Given
            role="progressbar" semantics — the same a11y treatment the /verify
            playback progressbar carries (§6.39) — so a screen-reader user
            perceives how close they are to being able to certify, not just the
            sighted writer watching the bar fill. `aria-valuenow` is capped at
            the 10-word max so the value never overshoots; `aria-valuetext`
            speaks the human phrasing the footer status shows. */}
        <div
          className="h-0.5 bg-deep-blue/[0.04]"
          role="progressbar"
          aria-label="Words toward the 10-word certification minimum"
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={Math.min(wordCount, 10)}
          aria-valuetext={wordCount < 10 ? `${wordCount} of 10 words` : 'Ready to certify'}
        >
          <div
            className="h-full bg-deep-blue/20 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-5 md:px-8 py-3 md:py-4 bg-cream">
          <span className="text-sm text-deep-blue/35">
            {wordCount < 10
              ? `${10 - wordCount} more word${10 - wordCount === 1 ? '' : 's'} to certify`
              : 'Ready to certify'
            }
          </span>

          <button
            onClick={handleSubmit}
            disabled={wordCount < 10 || isSubmitting}
            className="group flex items-center gap-2 px-6 py-2.5 bg-deep-blue text-cream rounded-full font-medium text-sm
                       hover:bg-deep-blue/90 transition-all duration-200
                       disabled:opacity-30 disabled:cursor-not-allowed
                       enabled:hover:-translate-y-0.5"
          >
            Complete
            {wordCount >= 10 && !isSubmitting && (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-0.5 transition-transform">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
