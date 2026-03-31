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
  acceptCurrentChunkRight: () => void;
  getConflictDataAtPos: () => ConflictData | null;
  applyCustomEdit: (range: any, text: string) => void;
  undoOriginal: () => void;
  redoOriginal: () => void;
  undoModified: () => void;
  redoModified: () => void;
  goToNextDiff: () => void;
  goToPrevDiff: () => void;
  acceptCurrentLineLeft: () => void;
  appendCurrentChunkLeft: () => void;
  appendCurrentChunkRight: () => void;
  acceptAllKeepBoth: () => void;
  singleMergeAll: (language: string) => Promise<{ success: boolean; error?: string } | void>;
  getAllConflicts: () => ConflictData[];
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
    const lastFocusedEditorRef = useRef<'original' | 'modified'>('modified');

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

        const isOriginal = lastFocusedEditorRef.current === 'original';
        const activeEditor = isOriginal ? diffEditor.getOriginalEditor() : diffEditor.getModifiedEditor();
        const pos = activeEditor.getPosition();
        
        let nextChange;
        if (isOriginal) {
          nextChange = changes.find((c: any) => Math.max(c.originalStartLineNumber, 1) > pos.lineNumber);
          if (!nextChange) nextChange = changes[0];
          if (nextChange) {
            const jumpLine = Math.max(nextChange.originalStartLineNumber, 1);
            const endLine = Math.max(nextChange.originalEndLineNumber, jumpLine);
            const maxCol = activeEditor.getModel()?.getLineMaxColumn(endLine) || 1;
            activeEditor.revealLineInCenter(jumpLine);
            activeEditor.setSelection(new monaco.Selection(jumpLine, 1, endLine, maxCol));
            activeEditor.focus();
          }
        } else {
          nextChange = changes.find((c: any) => Math.max(c.modifiedStartLineNumber, 1) > pos.lineNumber);
          if (!nextChange) nextChange = changes[0];
          if (nextChange) {
            const jumpLine = Math.max(nextChange.modifiedStartLineNumber, 1);
            const endLine = Math.max(nextChange.modifiedEndLineNumber, jumpLine);
            const maxCol = activeEditor.getModel()?.getLineMaxColumn(endLine) || 1;
            activeEditor.revealLineInCenter(jumpLine);
            activeEditor.setSelection(new monaco.Selection(jumpLine, 1, endLine, maxCol));
            activeEditor.focus();
          }
        }
      },
      goToPrevDiff: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return;

        const isOriginal = lastFocusedEditorRef.current === 'original';
        const activeEditor = isOriginal ? diffEditor.getOriginalEditor() : diffEditor.getModifiedEditor();
        const pos = activeEditor.getPosition();
        
        let prevChange;
        if (isOriginal) {
          prevChange = [...changes].reverse().find((c: any) => Math.max(c.originalStartLineNumber, 1) < pos.lineNumber);
          if (!prevChange) prevChange = changes[changes.length - 1];
          if (prevChange) {
            const jumpLine = Math.max(prevChange.originalStartLineNumber, 1);
            const endLine = Math.max(prevChange.originalEndLineNumber, jumpLine);
            const maxCol = activeEditor.getModel()?.getLineMaxColumn(endLine) || 1;
            activeEditor.revealLineInCenter(jumpLine);
            activeEditor.setSelection(new monaco.Selection(jumpLine, 1, endLine, maxCol));
            activeEditor.focus();
          }
        } else {
          prevChange = [...changes].reverse().find((c: any) => Math.max(c.modifiedStartLineNumber, 1) < pos.lineNumber);
          if (!prevChange) prevChange = changes[changes.length - 1];
          if (prevChange) {
            const jumpLine = Math.max(prevChange.modifiedStartLineNumber, 1);
            const endLine = Math.max(prevChange.modifiedEndLineNumber, jumpLine);
            const maxCol = activeEditor.getModel()?.getLineMaxColumn(endLine) || 1;
            activeEditor.revealLineInCenter(jumpLine);
            activeEditor.setSelection(new monaco.Selection(jumpLine, 1, endLine, maxCol));
            activeEditor.focus();
          }
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
      getAllConflicts: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return [];
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return [];

        const originalModel = diffEditor.getOriginalEditor().getModel();
        const modifiedModel = diffEditor.getModifiedEditor().getModel();
        const conflicts: ConflictData[] = [];

        changes.forEach((change: any) => {
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

           conflicts.push({ originalText: orgText, modifiedText: modText, modifiedRange: modRange });
        });
        
        return conflicts;
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

           diffEditor.getModifiedEditor().getAction('editor.action.accessibleDiffViewer.next')?.run();
        }
      },
      acceptCurrentChunkRight: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return;

        const modifiedEditor = diffEditor.getModifiedEditor();
        const originalEditor = diffEditor.getOriginalEditor();
        const pos = modifiedEditor.getPosition();
        const originalModel = originalEditor.getModel();
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

           let textToInsert = "";
           if (modifiedEndLineNumber > 0 && modifiedStartLineNumber > 0) {
             const startRange = new monaco.Range(modifiedStartLineNumber, 1, modifiedEndLineNumber, modifiedModel.getLineMaxColumn(modifiedEndLineNumber));
             textToInsert = modifiedModel.getValueInRange(startRange);
           }

           const rStart = originalStartLineNumber === 0 ? originalStartLineNumber + 1 : originalStartLineNumber;
           let rEnd = originalEndLineNumber === 0 ? originalStartLineNumber : originalEndLineNumber;
           if (rEnd === 0) rEnd = 1;
           const rStartBounded = rStart === 0 ? 1 : rStart;
           
           let range = new monaco.Range(rStartBounded, 1, rEnd, originalModel.getLineMaxColumn(rEnd));

           originalEditor.executeEdits("merge", [{
             range: range,
             text: textToInsert,
             forceMoveMarkers: true
           }]);

           diffEditor.getModifiedEditor().getAction('editor.action.accessibleDiffViewer.next')?.run();
        }
      },
      appendCurrentChunkLeft: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return;

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

           let originalTextToInsert = "";
           if (originalEndLineNumber > 0 && originalStartLineNumber > 0) {
             const startRange = new monaco.Range(originalStartLineNumber, 1, originalEndLineNumber, originalModel.getLineMaxColumn(originalEndLineNumber));
             originalTextToInsert = originalModel.getValueInRange(startRange);
           }

           let modifiedTextToInsert = "";
           if (modifiedEndLineNumber > 0 && modifiedStartLineNumber > 0) {
             const startRange = new monaco.Range(modifiedStartLineNumber, 1, modifiedEndLineNumber, modifiedModel.getLineMaxColumn(modifiedEndLineNumber));
             modifiedTextToInsert = modifiedModel.getValueInRange(startRange);
           }

           let textToInsert = "";
           if (originalTextToInsert && modifiedTextToInsert) {
             textToInsert = originalTextToInsert + "\n" + modifiedTextToInsert;
           } else {
             textToInsert = originalTextToInsert || modifiedTextToInsert;
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

           diffEditor.getModifiedEditor().getAction('editor.action.accessibleDiffViewer.next')?.run();
        }
      },
      acceptAllKeepBoth: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return;

        const modifiedEditor = diffEditor.getModifiedEditor();
        const originalModel = diffEditor.getOriginalEditor().getModel();
        const modifiedModel = modifiedEditor.getModel();

        // Sort changes in descending order by modified start line 
        // to avoid position shifting when applying multiple edits
        const sortedChanges = [...changes].sort((a: any, b: any) => 
          (b.modifiedStartLineNumber || 0) - (a.modifiedStartLineNumber || 0)
        );

        const edits: any[] = [];

        sortedChanges.forEach((change: any) => {
           const { originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber } = change;

           let originalTextToInsert = "";
           if (originalEndLineNumber > 0 && originalStartLineNumber > 0) {
             const startRange = new monaco.Range(originalStartLineNumber, 1, originalEndLineNumber, originalModel.getLineMaxColumn(originalEndLineNumber));
             originalTextToInsert = originalModel.getValueInRange(startRange);
           }

           let modifiedTextToInsert = "";
           if (modifiedEndLineNumber > 0 && modifiedStartLineNumber > 0) {
             const startRange = new monaco.Range(modifiedStartLineNumber, 1, modifiedEndLineNumber, modifiedModel.getLineMaxColumn(modifiedEndLineNumber));
             modifiedTextToInsert = modifiedModel.getValueInRange(startRange);
           }

           let textToInsert = "";
           if (originalTextToInsert && modifiedTextToInsert) {
             textToInsert = originalTextToInsert + "\n" + modifiedTextToInsert;
           } else {
             textToInsert = originalTextToInsert || modifiedTextToInsert;
           }

           const rStart = modifiedStartLineNumber === 0 ? modifiedStartLineNumber + 1 : modifiedStartLineNumber;
           let rEnd = modifiedEndLineNumber === 0 ? modifiedStartLineNumber : modifiedEndLineNumber;
           if (rEnd === 0) rEnd = 1;
           const rStartBounded = rStart === 0 ? 1 : rStart;
           
           let range = new monaco.Range(rStartBounded, 1, rEnd, modifiedModel.getLineMaxColumn(rEnd));

           edits.push({
             range: range,
             text: textToInsert,
             forceMoveMarkers: true
           });
        });

        modifiedEditor.executeEdits("merge-all", edits);
      },
      singleMergeAll: async (language: string) => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return { success: false, error: "Editor not initialized" };
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return { success: true };

        const modifiedEditor = diffEditor.getModifiedEditor();
        const originalModel = diffEditor.getOriginalEditor().getModel();
        const modifiedModel = modifiedEditor.getModel();

        const originalLines = originalModel.getValue().split(/\r?\n/);
        const originalSet = new Set();
        originalLines.forEach((line: string) => {
            const trimmed = line.trim();
            if (trimmed) originalSet.add(trimmed);
        });

        const newLinesToAppend: string[] = [];

        changes.forEach((change: any) => {
           if (change.modifiedEndLineNumber > 0 && change.modifiedStartLineNumber > 0) {
              const start = change.modifiedStartLineNumber;
              const end = change.modifiedEndLineNumber;
              for (let i = start; i <= end; i++) {
                 const lineContent = modifiedModel.getLineContent(i);
                 const trimmed = lineContent.trim();
                 if (trimmed && !originalSet.has(trimmed)) {
                    newLinesToAppend.push(lineContent);
                    originalSet.add(trimmed);
                 }
              }
           }
        });

        let finalContent = originalModel.getValue();
        if (newLinesToAppend.length > 0) {
           if (finalContent.length > 0 && !finalContent.endsWith("\n")) {
               finalContent += "\n";
           }
           finalContent += "\n" + newLinesToAppend.join("\n");
        }

        // Structural Validation Implementation
        if (language === "xml") {
           const parser = new DOMParser();
           const doc = parser.parseFromString(finalContent, "text/xml");
           const errorNode = doc.querySelector("parsererror");
           if (errorNode) {
              return { success: false, error: "XML Parsing Error: " + (errorNode.textContent || "Invalid structure") };
           }
        } else if (language === "python" || language === "go") {
           try {
              const res = await fetch("/api/validate", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ language, content: finalContent })
              });
              const data = await res.json();
              if (!res.ok || !data.valid) {
                 return { success: false, error: data.error || "Syntax check failed" };
              }
           } catch (e: any) {
              return { success: false, error: "Validation server request failed" };
           }
        }

        const lineCount = modifiedModel.getLineCount();
        const lastColumn = modifiedModel.getLineMaxColumn(lineCount);
        const range = new monaco.Range(1, 1, Math.max(1, lineCount), Math.max(1, lastColumn));

        modifiedEditor.executeEdits("single-merge-all", [{
           range: range,
           text: finalContent,
           forceMoveMarkers: true
        }]);
        return { success: true };
      },
      appendCurrentChunkRight: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return;

        const modifiedEditor = diffEditor.getModifiedEditor();
        const originalEditor = diffEditor.getOriginalEditor();
        const pos = modifiedEditor.getPosition();
        const originalModel = originalEditor.getModel();
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

           let originalTextToInsert = "";
           if (originalEndLineNumber > 0 && originalStartLineNumber > 0) {
             const startRange = new monaco.Range(originalStartLineNumber, 1, originalEndLineNumber, originalModel.getLineMaxColumn(originalEndLineNumber));
             originalTextToInsert = originalModel.getValueInRange(startRange);
           }

           let modifiedTextToInsert = "";
           if (modifiedEndLineNumber > 0 && modifiedStartLineNumber > 0) {
             const startRange = new monaco.Range(modifiedStartLineNumber, 1, modifiedEndLineNumber, modifiedModel.getLineMaxColumn(modifiedEndLineNumber));
             modifiedTextToInsert = modifiedModel.getValueInRange(startRange);
           }

           let textToInsert = "";
           if (originalTextToInsert && modifiedTextToInsert) {
             textToInsert = modifiedTextToInsert + "\n" + originalTextToInsert;
           } else {
             textToInsert = modifiedTextToInsert || originalTextToInsert;
           }

           const rStart = originalStartLineNumber === 0 ? originalStartLineNumber + 1 : originalStartLineNumber;
           let rEnd = originalEndLineNumber === 0 ? originalStartLineNumber : originalEndLineNumber;
           if (rEnd === 0) rEnd = 1;
           const rStartBounded = rStart === 0 ? 1 : rStart;
           
           let range = new monaco.Range(rStartBounded, 1, rEnd, originalModel.getLineMaxColumn(rEnd));

           originalEditor.executeEdits("merge", [{
             range: range,
             text: textToInsert,
             forceMoveMarkers: true
           }]);

           diffEditor.getModifiedEditor().getAction('editor.action.accessibleDiffViewer.next')?.run();
        }
      },
      acceptCurrentLineLeft: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return;
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return;

        const isOriginal = lastFocusedEditorRef.current === 'original';
        const modifiedEditor = diffEditor.getModifiedEditor();
        const originalEditor = diffEditor.getOriginalEditor();
        const originalModel = originalEditor.getModel();
        const modifiedModel = modifiedEditor.getModel();

        let pos: any;
        let change;
        if (isOriginal) {
          pos = originalEditor.getPosition();
          change = changes.find((c: any) => 
            pos.lineNumber >= c.originalStartLineNumber && 
            Math.max(c.originalStartLineNumber, 1) <= pos.lineNumber &&
            pos.lineNumber <= Math.max(c.originalEndLineNumber, c.originalStartLineNumber)
          );
        } else {
          pos = modifiedEditor.getPosition();
          change = changes.find((c: any) => 
            pos.lineNumber >= c.modifiedStartLineNumber && 
            Math.max(c.modifiedStartLineNumber, 1) <= pos.lineNumber &&
            pos.lineNumber <= Math.max(c.modifiedEndLineNumber, c.modifiedStartLineNumber)
          );
        }

        if (!change) return;

        const { originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber } = change;

        let orgLineNum = 0;
        let modPosLine = 0;
        let isDeletionInModified = modifiedEndLineNumber === 0;
        let isAdditionInModified = originalEndLineNumber === 0;

        if (isOriginal) {
           orgLineNum = pos.lineNumber;
           if (isAdditionInModified) return; 
           let offset = orgLineNum - originalStartLineNumber;
           if (isDeletionInModified) {
              modPosLine = modifiedStartLineNumber;
           } else {
              modPosLine = modifiedStartLineNumber + offset;
              if (modPosLine > modifiedEndLineNumber) {
                 modPosLine = modifiedEndLineNumber;
              }
           }
        } else {
           modPosLine = pos.lineNumber;
           if (isAdditionInModified) {
             orgLineNum = 0; 
           } else if (isDeletionInModified) {
             orgLineNum = originalStartLineNumber;
           } else {
             let offset = modPosLine - modifiedStartLineNumber;
             orgLineNum = originalStartLineNumber + offset;
             if (orgLineNum > originalEndLineNumber) orgLineNum = 0;
           }
        }

        let editRange;
        let textToInsert = "";

        if (isOriginal && modPosLine > modifiedEndLineNumber && !isDeletionInModified) {
            // Append line to the end of the modified block
            let insertLine = modifiedEndLineNumber + 1;
            editRange = new monaco.Range(insertLine, 1, insertLine, 1);
            textToInsert = originalModel.getLineContent(orgLineNum) + "\n";
        } else if (isDeletionInModified) {
           let targetLine = modifiedStartLineNumber === 0 ? 1 : modifiedStartLineNumber + 1;
           editRange = new monaco.Range(targetLine, 1, targetLine, 1);
           if (orgLineNum > 0) {
             textToInsert = originalModel.getLineContent(orgLineNum) + "\n";
           }
        } else {
           if (orgLineNum === 0) {
              // Delete the line entirely from modified
              let endLine = modPosLine;
              let endCol = modifiedModel.getLineMaxColumn(modPosLine);
              if (modPosLine < modifiedModel.getLineCount()) {
                  endLine = modPosLine + 1;
                  endCol = 1;
              }
              editRange = new monaco.Range(modPosLine, 1, endLine, endCol);
              textToInsert = "";
           } else {
              // Replace the line exactly
              editRange = new monaco.Range(modPosLine, 1, modPosLine, modifiedModel.getLineMaxColumn(modPosLine));
              textToInsert = originalModel.getLineContent(orgLineNum);
           }
        }

        modifiedEditor.executeEdits("merge-line", [{
          range: editRange,
          text: textToInsert,
          forceMoveMarkers: true
        }]);
        
        if (isOriginal) {
           originalEditor.setPosition({ lineNumber: pos.lineNumber + 1, column: pos.column });
        } else {
           modifiedEditor.setPosition({ lineNumber: pos.lineNumber + 1, column: pos.column });
        }
      },
      getConflictDataAtPos: () => {
        const diffEditor = diffEditorRef.current;
        const monaco = monacoRef.current;
        if (!diffEditor || !monaco) return null;
        
        const changes = diffEditor.getLineChanges();
        if (!changes || changes.length === 0) return null;

        const isOriginal = lastFocusedEditorRef.current === 'original';
        const modifiedEditor = diffEditor.getModifiedEditor();
        const originalEditor = diffEditor.getOriginalEditor();
        const originalModel = originalEditor.getModel();
        const modifiedModel = modifiedEditor.getModel();

        let pos: any;
        let change;

        if (isOriginal) {
          pos = originalEditor.getPosition();
          change = changes.find((c: any) => 
            pos.lineNumber >= c.originalStartLineNumber && 
            pos.lineNumber <= Math.max(c.originalEndLineNumber, c.originalStartLineNumber)
          );
          if (!change) {
             change = changes.find((c: any) => Math.max(c.originalStartLineNumber, 1) >= pos.lineNumber);
          }
        } else {
          pos = modifiedEditor.getPosition();
          change = changes.find((c: any) => 
            pos.lineNumber >= c.modifiedStartLineNumber && 
            pos.lineNumber <= Math.max(c.modifiedEndLineNumber, c.modifiedStartLineNumber)
          );
          if (!change) {
            change = changes.find((c: any) => Math.max(c.modifiedStartLineNumber, 1) >= pos.lineNumber);
          }
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
          beforeMount={(monaco) => {
            monaco.editor.defineTheme('vimdiff-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [],
              colors: {
                'diffEditor.insertedLineBackground': '#11382099', // Dark strict green
                'diffEditor.insertedTextBackground': '#1f693b80', // Highlighted diff chunks
                'diffEditor.removedLineBackground': '#4a111199',  // Dark strict red
                'diffEditor.removedTextBackground': '#8a232380',  // Highlighted diff chunks
                'editor.background': '#09090b', // Seamless dark zinc background
              }
            });
            monaco.editor.defineTheme('vimdiff-light', {
              base: 'vs',
              inherit: true,
              rules: [],
              colors: {
                'diffEditor.insertedLineBackground': '#dcfce780',
                'diffEditor.insertedTextBackground': '#bbf7d080',
                'diffEditor.removedLineBackground': '#fee2e280',
                'diffEditor.removedTextBackground': '#fecaca80',
                'editor.background': '#ffffff',
              }
            });
            monaco.editor.defineTheme('dracula', {
              base: 'vs-dark',
              inherit: true,
              rules: [{ background: '282a36' }],
              colors: {
                'editor.background': '#282a36',
                'editor.foreground': '#f8f8f2',
                'diffEditor.insertedLineBackground': '#50fa7b33',
                'diffEditor.insertedTextBackground': '#50fa7b80',
                'diffEditor.removedLineBackground': '#ff555533',
                'diffEditor.removedTextBackground': '#ff555580',
              }
            });
            monaco.editor.defineTheme('monokai', {
              base: 'vs-dark',
              inherit: true,
              rules: [{ background: '272822' }],
              colors: {
                'editor.background': '#272822',
                'editor.foreground': '#f8f8f2',
                'diffEditor.insertedLineBackground': '#a6e22e33',
                'diffEditor.insertedTextBackground': '#a6e22e80',
                'diffEditor.removedLineBackground': '#f9267233',
                'diffEditor.removedTextBackground': '#f9267280',
              }
            });
            monaco.editor.defineTheme('github-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [{ background: '0d1117' }],
              colors: {
                'editor.background': '#0d1117',
                'editor.foreground': '#c9d1d9',
                'diffEditor.insertedLineBackground': '#23863633',
                'diffEditor.insertedTextBackground': '#23863680',
                'diffEditor.removedLineBackground': '#da363333',
                'diffEditor.removedTextBackground': '#da363380',
              }
            });
            monaco.editor.defineTheme('night-owl', {
              base: 'vs-dark',
              inherit: true,
              rules: [{ background: '011627' }],
              colors: {
                'editor.background': '#011627',
                'editor.foreground': '#d6deeb',
                'diffEditor.insertedLineBackground': '#addb6733',
                'diffEditor.insertedTextBackground': '#addb6780',
                'diffEditor.removedLineBackground': '#EF535033',
                'diffEditor.removedTextBackground': '#EF535080',
              }
            });
            monaco.editor.defineTheme('vimdiff-purple', {
              base: 'vs-dark',
              inherit: true,
              rules: [{ background: '1A0B2E' }],
              colors: {
                'editor.background': '#1A0B2E',
                'diffEditor.insertedLineBackground': '#11382099',
                'diffEditor.insertedTextBackground': '#1f693b80',
                'diffEditor.removedLineBackground': '#4a111199',
                'diffEditor.removedTextBackground': '#8a232380',
              }
            });
            monaco.editor.defineTheme('vimdiff-blue', {
              base: 'vs-dark',
              inherit: true,
              rules: [{ background: '0B1426' }],
              colors: {
                'editor.background': '#0B1426',
                'diffEditor.insertedLineBackground': '#11382099',
                'diffEditor.insertedTextBackground': '#1f693b80',
                'diffEditor.removedLineBackground': '#4a111199',
                'diffEditor.removedTextBackground': '#8a232380',
              }
            });
            monaco.editor.defineTheme('vimdiff-black', {
              base: 'vs-dark',
              inherit: true,
              rules: [{ background: '000000' }],
              colors: {
                'editor.background': '#000000',
                'diffEditor.insertedLineBackground': '#11382099',
                'diffEditor.insertedTextBackground': '#1f693b80',
                'diffEditor.removedLineBackground': '#4a111199',
                'diffEditor.removedTextBackground': '#8a232380',
              }
            });
          }}
          onMount={(editor, monaco) => {
            diffEditorRef.current = editor;
            monacoRef.current = monaco;
            
            // Track focus robustly
            editor.getOriginalEditor().onDidChangeCursorPosition(() => { lastFocusedEditorRef.current = 'original'; });
            editor.getModifiedEditor().onDidChangeCursorPosition(() => { lastFocusedEditorRef.current = 'modified'; });
            editor.getOriginalEditor().onDidFocusEditorWidget(() => { lastFocusedEditorRef.current = 'original'; });
            editor.getModifiedEditor().onDidFocusEditorWidget(() => { lastFocusedEditorRef.current = 'modified'; });
            
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
