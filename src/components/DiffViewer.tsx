"use client";

import { useTheme } from "next-themes";
import { DiffEditor, useMonaco } from "@monaco-editor/react";
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";

export interface DiffViewerRef {
  getOriginalContent: () => string;
  getModifiedContent: () => string;
  setOriginalContent: (val: string) => void;
  setModifiedContent: (val: string) => void;
  formatOriginal: () => void;
  formatModified: () => void;
  acceptCurrentChunkLeft: () => void;
  getConflictDataAtPos: () => ConflictData | null;
  applyCustomEdit: (range: any, text: string) => void;
  undoOriginal: () => void;
  redoOriginal: () => void;
  undoModified: () => void;
  redoModified: () => void;
  goToNextDiff: () => void;
  goToPrevDiff: () => void;
}

export interface ConflictData {
  originalText: string;
  modifiedText: string;
  modifiedRange: any;
}

export interface EditorStats {
  additions: number;
  deletions: number;
  changes: number;
}

interface DiffViewerProps {
  original: string;
  modified: string;
  language: string;
  isInline: boolean;
  theme: string;
  ignoreWhitespace: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  fontSize: number;
  onDiffUpdate?: (stats: EditorStats) => void;
}

export const DiffViewer = forwardRef<DiffViewerRef, DiffViewerProps>(
  ({ original, modified, language, isInline, theme, ignoreWhitespace, wordWrap, lineNumbers, fontSize, onDiffUpdate }, ref) => {
    const [mounted, setMounted] = useState(false);
    const diffEditorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);

    useEffect(() => setMounted(true), []);

    useImperativeHandle(ref, () => ({
      getOriginalContent: () => {
        return diffEditorRef.current?.getOriginalEditor()?.getValue() || original;
      },
      getModifiedContent: () => {
        return diffEditorRef.current?.getModifiedEditor()?.getValue() || modified;
      },
      goToNextDiff: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return;

        const modifiedEditor = diffEditor.getModifiedEditor();
        const pos = modifiedEditor.getPosition();
        
        let nextChange = changes.find((c: any) => Math.max(c.modifiedStartLineNumber, 1) > pos.lineNumber);
        if (!nextChange) nextChange = changes[0];

        if (nextChange) {
           const jumpLine = Math.max(nextChange.modifiedStartLineNumber, 1);
           const endLine = Math.max(nextChange.modifiedEndLineNumber, jumpLine);
           const maxCol = modifiedEditor.getModel()?.getLineMaxColumn(endLine) || 1;
           
           modifiedEditor.revealLineInCenter(jumpLine);
           modifiedEditor.setSelection(new monaco.Selection(jumpLine, 1, endLine, maxCol));
           modifiedEditor.focus();
        }
      },
      goToPrevDiff: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return;

        const modifiedEditor = diffEditor.getModifiedEditor();
        const pos = modifiedEditor.getPosition();
        
        let prevChange = [...changes].reverse().find((c: any) => Math.max(c.modifiedStartLineNumber, 1) < pos.lineNumber);
        if (!prevChange) prevChange = changes[changes.length - 1];

        if (prevChange) {
           const jumpLine = Math.max(prevChange.modifiedStartLineNumber, 1);
           const endLine = Math.max(prevChange.modifiedEndLineNumber, jumpLine);
           const maxCol = modifiedEditor.getModel()?.getLineMaxColumn(endLine) || 1;
           
           modifiedEditor.revealLineInCenter(jumpLine);
           modifiedEditor.setSelection(new monaco.Selection(jumpLine, 1, endLine, maxCol));
           modifiedEditor.focus();
        }
      },
      setOriginalContent: (val: string) => {
        diffEditorRef.current?.getOriginalEditor()?.setValue(val);
      },
      setModifiedContent: (val: string) => {
        diffEditorRef.current?.getModifiedEditor()?.setValue(val);
      },
      formatOriginal: () => {
        diffEditorRef.current?.getOriginalEditor()?.getAction('editor.action.formatDocument')?.run();
      },
      formatModified: () => {
        diffEditorRef.current?.getModifiedEditor()?.getAction('editor.action.formatDocument')?.run();
      },
      acceptCurrentChunkLeft: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return;

        const modifiedEditor = diffEditor.getModifiedEditor();
        const pos = modifiedEditor.getPosition();
        const originalModel = diffEditor.getOriginalEditor().getModel();
        const modifiedModel = modifiedEditor.getModel();

        // 1. Find the current change
        let change = changes.find((c: any) => 
          pos.lineNumber >= c.modifiedStartLineNumber && 
          pos.lineNumber <= (c.modifiedEndLineNumber === 0 ? c.modifiedStartLineNumber : c.modifiedEndLineNumber)
        );

        if (!change) {
          change = changes.find((c: any) => Math.max(c.modifiedStartLineNumber, 1) >= pos.lineNumber);
        }
        if (!change) {
           change = changes[0];
        }

        if (change) {
           const { originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber } = change;

           let textToInsert = "";
           if (originalEndLineNumber > 0 && originalStartLineNumber > 0) {
             const startRange = new monaco.Range(originalStartLineNumber, 1, originalEndLineNumber, originalModel.getLineMaxColumn(originalEndLineNumber));
             textToInsert = originalModel.getValueInRange(startRange);
           }

           const rStart = modifiedStartLineNumber === 0 ? modifiedStartLineNumber + 1 : modifiedStartLineNumber;
           let rEnd = modifiedEndLineNumber === 0 ? modifiedStartLineNumber : modifiedEndLineNumber;
           if (rEnd === 0) rEnd = 1;
           const rStartBounded = rStart === 0 ? 1 : rStart;
           
           let range = new monaco.Range(rStartBounded, 1, rEnd, modifiedModel.getLineMaxColumn(rEnd));

           modifiedEditor.executeEdits("merge", [{
             range: range,
             text: textToInsert,
             forceMoveMarkers: true
           }]);

           // Auto jump to next if possible
           diffEditor.getModifiedEditor().getAction('editor.action.accessibleDiffViewer.next')?.run();
        }
      },
      getConflictDataAtPos: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return null;
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return null;

        const modifiedEditor = diffEditor.getModifiedEditor();
        const pos = modifiedEditor.getPosition();
        const originalModel = diffEditor.getOriginalEditor().getModel();
        const modifiedModel = modifiedEditor.getModel();

        let change = changes.find((c: any) => 
          pos.lineNumber >= c.modifiedStartLineNumber && 
          pos.lineNumber <= (c.modifiedEndLineNumber === 0 ? c.modifiedStartLineNumber : c.modifiedEndLineNumber)
        );

        if (!change) {
          change = changes.find((c: any) => Math.max(c.modifiedStartLineNumber, 1) >= pos.lineNumber);
        }
        if (!change) {
           change = changes[0];
        }

        if (change) {
           const { originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber } = change;

           let orgText = "";
           if (originalEndLineNumber > 0 && originalStartLineNumber > 0) {
             const startRange = new monaco.Range(originalStartLineNumber, 1, originalEndLineNumber, originalModel.getLineMaxColumn(originalEndLineNumber));
             orgText = originalModel.getValueInRange(startRange);
           }

           const rStart = modifiedStartLineNumber === 0 ? modifiedStartLineNumber + 1 : modifiedStartLineNumber;
           let rEnd = modifiedEndLineNumber === 0 ? modifiedStartLineNumber : modifiedEndLineNumber;
           if (rEnd === 0) rEnd = 1;
           const rStartBounded = rStart === 0 ? 1 : rStart;
           
           let modRange = new monaco.Range(rStartBounded, 1, rEnd, modifiedModel.getLineMaxColumn(rEnd));
           const modText = modifiedModel.getValueInRange(modRange);

           return { originalText: orgText, modifiedText: modText, modifiedRange: modRange };
        }
        return null;
      },
      applyCustomEdit: (range: any, text: string) => {
          diffEditorRef.current?.getModifiedEditor()?.executeEdits("resolution", [{
             range: range,
             text: text,
             forceMoveMarkers: true
          }]);
      },
      undoOriginal: () => diffEditorRef.current?.getOriginalEditor()?.trigger('keyboard', 'undo', null),
      redoOriginal: () => diffEditorRef.current?.getOriginalEditor()?.trigger('keyboard', 'redo', null),
      undoModified: () => diffEditorRef.current?.getModifiedEditor()?.trigger('keyboard', 'undo', null),
      redoModified: () => diffEditorRef.current?.getModifiedEditor()?.trigger('keyboard', 'redo', null),
    }));

    if (!mounted) {
      return (
        <div className="flex-1 w-full h-full bg-zinc-50 dark:bg-zinc-950 animate-pulse flex items-center justify-center">
          <span className="text-zinc-400">Loading editor...</span>
        </div>
      );
    }

    return (
      <div className="flex-1 w-full h-full overflow-hidden border-t border-zinc-200 dark:border-zinc-800">
        <DiffEditor
          original={original}
          modified={modified}
          language={language}
          theme={theme}
          onMount={(editor, monaco) => {
            diffEditorRef.current = editor;
            monacoRef.current = monaco;
            editor.onDidUpdateDiff(() => {
              const changes = editor.getLineChanges();
              if (!changes) return;
              let additions = 0;
              let deletions = 0;
              changes.forEach((c: any) => {
                const added = c.modifiedEndLineNumber > 0 ? (c.modifiedEndLineNumber - c.modifiedStartLineNumber + 1) : 0;
                const removed = c.originalEndLineNumber > 0 ? (c.originalEndLineNumber - c.originalStartLineNumber + 1) : 0;
                additions += added;
                deletions += removed;
              });
              onDiffUpdate?.({ additions, deletions, changes: changes.length });
            });
          }}
          options={{
            renderSideBySide: !isInline,
            originalEditable: true,
            readOnly: false,
            minimap: { enabled: true },
            fontSize: fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            ignoreTrimWhitespace: ignoreWhitespace,
            wordWrap: wordWrap ? "on" : "off",
            lineNumbers: lineNumbers ? "on" : "off",
            padding: { top: 16 },
          }}
        />
      </div>
    );
  }
);

DiffViewer.displayName = "DiffViewer";
