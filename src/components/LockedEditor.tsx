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

  const progressPercent = Math.min(100, (wordCount / 10) * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-deep-blue/10 bg-gradient-to-r from-cream to-white gap-3 md:gap-0">
        <div className="flex items-center gap-3 md:gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled Document"
            className="text-lg md:text-xl font-semibold bg-transparent border-none outline-none text-deep-blue placeholder-deep-blue/30 w-full md:w-64 focus:placeholder-deep-blue/50 transition-colors"
          />
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full border border-red-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-xs font-medium text-red-600">Recording</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 md:gap-6 text-sm">
          <div className="flex items-center gap-2 text-deep-blue/60">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-50">
              <path d="M8 4V8L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span className="font-mono">{formatDuration(elapsedTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-deep-blue/60">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-50">
              <path d="M3 4H13M3 8H10M3 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="font-medium">{wordCount} words</span>
          </div>
          {blockedPasteCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full border border-orange-200">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-orange-500">
                <path d="M8 6V8M8 10H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M3 14L8 3L13 14H3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-xs font-medium text-orange-600">
                {blockedPasteCount} paste{blockedPasteCount > 1 ? 's' : ''} blocked
              </span>
            </div>
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
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            lineHeight: 1.9,
            padding: { top: 32, bottom: 32 },
            renderWhitespace: 'none',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'hidden',
              verticalScrollbarSize: 8,
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
          <div className="absolute top-32 left-0 right-0 flex justify-center pointer-events-none">
            <div className="text-deep-blue/20 text-sm italic">Start typing to begin your session...</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-deep-blue/10 bg-gradient-to-r from-cream to-white">
        {/* Progress bar */}
        <div className="h-1 bg-deep-blue/5">
          <div 
            className="h-full bg-gradient-to-r from-accent to-success transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-2 text-sm text-deep-blue/50">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-50">
              <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>
              {wordCount < 10 
                ? `${10 - wordCount} more word${10 - wordCount === 1 ? '' : 's'} needed`
                : 'Ready to certify!'
              }
            </span>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={wordCount < 10}
            className="group flex items-center gap-2 px-5 md:px-6 py-2.5 bg-deep-blue text-cream rounded-xl font-medium 
                       hover:bg-deep-blue/90 transition-all duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed
                       enabled:shadow-lg enabled:shadow-deep-blue/20 enabled:hover:shadow-xl enabled:hover:shadow-deep-blue/30
                       enabled:hover:-translate-y-0.5"
          >
            {wordCount < 10 ? (
              <>
                <span>Complete</span>
                <span className="text-cream/60 text-sm">({wordCount}/10)</span>
              </>
            ) : (
              <>
                <span>Complete</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-0.5 transition-transform">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
