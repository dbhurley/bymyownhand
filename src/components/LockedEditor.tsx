'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { KeystrokeEvent, WritingSession } from '@/lib/types';
import { calculateMetrics, calculateIntegrityScore, countWords, formatDuration } from '@/lib/metrics';
import { clearDraft, DRAFT_STORAGE_KEY, type DraftSnapshot } from '@/lib/draft';
import { nanoid } from 'nanoid';

interface LockedEditorProps {
  onComplete: (session: WritingSession) => void;
  title: string;
  onTitleChange: (title: string) => void;
  initialDraft?: DraftSnapshot | null;
}

export default function LockedEditor({ onComplete, title, onTitleChange, initialDraft }: LockedEditorProps) {
  const [content, setContent] = useState(initialDraft?.content ?? '');
  const [wordCount, setWordCount] = useState(0);
  const [sessionId] = useState(() => initialDraft?.sessionId ?? nanoid());
  const [startTime] = useState(() => initialDraft?.startTime ?? Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [blockedPasteCount, setBlockedPasteCount] = useState(() => initialDraft?.blockedPasteCount ?? 0);
  const [isRecording, setIsRecording] = useState(true);

  const eventsRef = useRef<KeystrokeEvent[]>(initialDraft?.events ?? []);
  const internalClipboard = useRef<string>('');
  const editorRef = useRef<any>(null);

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

  const handleEditorMount: OnMount = (editor, monaco) => {
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

      // Check if it's a deletion
      if (e.code === 'Backspace' || e.code === 'Delete') {
        recordEvent({
          type: 'delete',
          key: e.code,
          pos,
        });
        return;
      }

      // Record regular keystroke
      if (e.code.startsWith('Key') || e.code.startsWith('Digit') ||
          e.code === 'Space' || e.code === 'Enter' ||
          e.code.startsWith('Bracket') || e.code.startsWith('Quote') ||
          e.code === 'Comma' || e.code === 'Period' || e.code === 'Semicolon') {
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
  useEffect(() => {
    if (!isRecording) return;
    if (typeof window === 'undefined') return;

    const persist = () => {
      if (!content.trim() && !title.trim()) return;
      const snapshot: DraftSnapshot = {
        sessionId,
        title,
        content,
        events: eventsRef.current,
        startTime,
        blockedPasteCount,
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
  }, [content, title, sessionId, startTime, blockedPasteCount, isRecording]);

  const handleSubmit = () => {
    setIsRecording(false);

    const metrics = calculateMetrics(eventsRef.current, content);
    const integrityScore = calculateIntegrityScore(metrics, wordCount, elapsedTime);

    const session: WritingSession = {
      id: sessionId,
      startedAt: startTime,
      endedAt: Date.now(),
      events: eventsRef.current,
      metrics,
      content,
      wordCount,
      integrityScore,
    };

    clearDraft();

    onComplete(session);
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
            className="text-lg font-semibold bg-transparent border-none outline-none text-deep-blue placeholder-deep-blue/25 w-full md:w-72 focus:placeholder-deep-blue/40 transition-colors"
          />
          {isRecording && (
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
        {/* Progress */}
        <div className="h-0.5 bg-deep-blue/[0.04]">
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
            disabled={wordCount < 10}
            className="group flex items-center gap-2 px-6 py-2.5 bg-deep-blue text-cream rounded-full font-medium text-sm
                       hover:bg-deep-blue/90 transition-all duration-200
                       disabled:opacity-30 disabled:cursor-not-allowed
                       enabled:hover:-translate-y-0.5"
          >
            Complete
            {wordCount >= 10 && (
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
