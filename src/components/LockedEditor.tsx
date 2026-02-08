'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { KeystrokeEvent, WritingSession } from '@/lib/types';
import { calculateMetrics, calculateIntegrityScore, formatDuration } from '@/lib/metrics';
import { nanoid } from 'nanoid';

interface LockedEditorProps {
  onComplete: (session: WritingSession) => void;
  title: string;
  onTitleChange: (title: string) => void;
}

export default function LockedEditor({ onComplete, title, onTitleChange }: LockedEditorProps) {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [sessionId] = useState(() => nanoid());
  const [startTime] = useState(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [blockedPasteCount, setBlockedPasteCount] = useState(0);
  const [isRecording, setIsRecording] = useState(true);
  
  const eventsRef = useRef<KeystrokeEvent[]>([]);
  const internalClipboard = useRef<string>('');
  const editorRef = useRef<any>(null);
  const lastContentRef = useRef<string>('');

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Calculate word count
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
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
    const newContent = value || '';
    lastContentRef.current = newContent;
    setContent(newContent);
  };

  const handleSubmit = () => {
    setIsRecording(false);
    
    const metrics = calculateMetrics(eventsRef.current);
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
    
    onComplete(session);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-deep-blue/10 bg-cream">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled Document"
            className="text-xl font-semibold bg-transparent border-none outline-none text-deep-blue placeholder-deep-blue/40 w-64"
          />
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-recording" />
              Recording
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-6 text-sm text-deep-blue/70">
          <span>{wordCount} words</span>
          <span>{formatDuration(elapsedTime)}</span>
          {blockedPasteCount > 0 && (
            <span className="text-orange-600">
              {blockedPasteCount} paste{blockedPasteCount > 1 ? 's' : ''} blocked
            </span>
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
            fontSize: 16,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            lineHeight: 1.8,
            padding: { top: 24, bottom: 24 },
            renderWhitespace: 'none',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'hidden',
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
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-deep-blue/10 bg-cream">
        <p className="text-sm text-deep-blue/60">
          {wordCount < 10 
            ? `Write at least ${10 - wordCount} more word${10 - wordCount === 1 ? '' : 's'} to complete`
            : 'Ready to submit for certification'
          }
        </p>
        
        <button
          onClick={handleSubmit}
          disabled={wordCount < 10}
          className="px-6 py-2 bg-deep-blue text-cream rounded-lg font-medium 
                     hover:bg-deep-blue/90 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {wordCount < 10 ? `Complete (${wordCount}/10 words)` : 'Complete'}
        </button>
      </div>
    </div>
  );
}
