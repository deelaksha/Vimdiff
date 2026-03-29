"use client";

import { useState, useRef, useEffect } from "react";
import { Toolbar } from "@/components/Toolbar";
import { DiffViewer, DiffViewerRef, ConflictData } from "@/components/DiffViewer";
import { StatusBar } from "@/components/StatusBar";
import { Tooltip } from "@/components/Tooltip";
import { createPatch } from "diff";
import { GitMerge, ChevronUp, ChevronDown, ArrowRight, ArrowLeft, Check, X, Edit2, Undo2, Redo2, ArrowRightToLine } from "lucide-react";

const SAMPLE_ORIGINAL = `export function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

// Helper fetch function
async function getData(url) {
  const res = await fetch(url);
  return res.json();
}
`;

const SAMPLE_MODIFIED = `export function calculateTotal(items) {
  // Use reduce for cleaner code
  return items.reduce((total, item) => total + item.price, 0);
}

// Helper fetch function with error handling
async function getData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    return await res.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}
`;

export default function Home() {
  const [original, setOriginal] = useState(SAMPLE_ORIGINAL);
  const [modified, setModified] = useState(SAMPLE_MODIFIED);
  const [language, setLanguage] = useState("javascript");
  const [isInline, setIsInline] = useState(false);
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  
  const [wordWrap, setWordWrap] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [diffStats, setDiffStats] = useState({ additions: 0, deletions: 0, changes: 0 });

  const [activeConflict, setActiveConflict] = useState<ConflictData | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const diffRef = useRef<DiffViewerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // VIM keyboard shortcuts matching
  useEffect(() => {
    let lastKey = "";
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input inside toolbar
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "]" || e.key === "[") {
        lastKey = e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => { lastKey = ""; }, 1000);
      } else if (e.key.toLowerCase() === "c") {
        if (lastKey === "]") {
          diffRef.current?.goToNextDiff();
          lastKey = "";
          e.preventDefault();
        } else if (lastKey === "[") {
          diffRef.current?.goToPrevDiff();
          lastKey = "";
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClear = () => {
    setOriginal("");
    setModified("");
  };

  const handleExport = () => {
    if (!diffRef.current) return;
    
    const currentOrg = diffRef.current.getOriginalContent();
    const currentMod = diffRef.current.getModifiedContent();
    
    // Create unified patch
    const patch = createPatch(
      "comparison.js",
      currentOrg,
      currentMod,
      "original file",
      "modified file"
    );
    
    // Trigger download
    const blob = new Blob([patch], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diff.patch";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSwap = () => {
    if (!diffRef.current) return;
    const currentOrg = diffRef.current.getOriginalContent();
    const currentMod = diffRef.current.getModifiedContent();
    setOriginal(currentMod);
    setModified(currentOrg);
    diffRef.current.setOriginalContent(currentMod);
    diffRef.current.setModifiedContent(currentOrg);
  };

  const handleAcceptLeft = () => {
    if (!diffRef.current) return;
    const currentOrg = diffRef.current.getOriginalContent();
    setModified(currentOrg);
    diffRef.current.setModifiedContent(currentOrg);
  };

  const handleAcceptRight = () => {
    if (!diffRef.current) return;
    const currentMod = diffRef.current.getModifiedContent();
    setOriginal(currentMod);
    diffRef.current.setOriginalContent(currentMod);
  };

  const handleCopyOriginal = () => {
    if (!diffRef.current) return;
    navigator.clipboard.writeText(diffRef.current.getOriginalContent());
  };

  const handleCopyModified = () => {
    if (!diffRef.current) return;
    navigator.clipboard.writeText(diffRef.current.getModifiedContent());
  };

  const handleFormatBoth = () => {
    if (!diffRef.current) return;
    diffRef.current.formatOriginal();
    diffRef.current.formatModified();
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      <Toolbar 
        language={language}
        setLanguage={setLanguage}
        isInline={isInline}
        setIsInline={setIsInline}
        onOriginalUpload={(content) => setOriginal(content)}
        onModifiedUpload={(content) => setModified(content)}
        onClear={handleClear}
        onExport={handleExport}
        onNextDiff={() => diffRef.current?.goToNextDiff()}
        onPrevDiff={() => diffRef.current?.goToPrevDiff()}
        editorTheme={editorTheme}
        setEditorTheme={setEditorTheme}
        onSwap={handleSwap}
        onAcceptLeft={handleAcceptLeft}
        onAcceptRight={handleAcceptRight}
        ignoreWhitespace={ignoreWhitespace}
        setIgnoreWhitespace={setIgnoreWhitespace}
        onFormatBoth={handleFormatBoth}
        onCopyOriginal={handleCopyOriginal}
        onCopyModified={handleCopyModified}
        wordWrap={wordWrap}
        setWordWrap={setWordWrap}
        lineNumbers={lineNumbers}
        setLineNumbers={setLineNumbers}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onDownloadOriginal={() => diffRef.current && downloadFile("original.txt", diffRef.current.getOriginalContent())}
        onDownloadModified={() => diffRef.current && downloadFile("modified.txt", diffRef.current.getModifiedContent())}
      />
      
      {/* Conflict Resolver Header UI */}
      <div className="flex w-full bg-indigo-50 dark:bg-zinc-900 border-b border-indigo-200 dark:border-indigo-900 shadow-sm z-10 px-4 py-2 items-center justify-center gap-4 text-sm overflow-x-auto shrink-0">
         <span className="font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2 whitespace-nowrap">
            <GitMerge size={16} /> Conflict Wizard
         </span>
         <div className="h-4 w-px bg-indigo-300 dark:bg-indigo-800 mx-2" />
         <button onClick={() => diffRef.current?.goToPrevDiff()} className="px-3 py-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition shadow-sm flex items-center gap-1 whitespace-nowrap">
            <ChevronUp size={14} /> Prev Conflict
         </button>
         <button onClick={() => diffRef.current?.goToNextDiff()} className="px-3 py-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition shadow-sm flex items-center gap-1 whitespace-nowrap">
            <ChevronDown size={14} /> Next Conflict
         </button>
         <div className="h-4 w-px bg-indigo-300 dark:bg-indigo-800 mx-2" />
         <button onClick={() => {
            const data = diffRef.current?.getConflictDataAtPos();
            if (data) {
              setActiveConflict(data);
              setResolutionText(data.modifiedText);
            }
         }} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800/80 hover:bg-purple-200 dark:hover:bg-purple-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap" title="Edit this particular block in an isolated popup">
            <Edit2 size={14} /> Edit Block
         </button>
         <button onClick={() => diffRef.current?.acceptCurrentChunkRight()} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 hover:bg-amber-200 dark:hover:bg-amber-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap">
            <ArrowLeft size={14} /> Accept Modified (Right {'->'} Left)
         </button>
         <button onClick={() => diffRef.current?.acceptCurrentChunkLeft()} className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800/80 hover:bg-green-200 dark:hover:bg-green-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap">
            <ArrowRight size={14} /> Accept Original Block
         </button>
         <button onClick={() => diffRef.current?.acceptCurrentLineLeft()} className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap">
            <ArrowRightToLine size={14} /> Accept Single Line
         </button>
         <button onClick={() => diffRef.current?.goToNextDiff()} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800/80 hover:bg-blue-200 dark:hover:bg-blue-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap">
            <Check size={14} /> Keep Right (Accept Modified)
         </button>
      </div>

      {/* Container for file headers */}
      <div className="flex w-full bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm z-10 text-xs font-mono text-zinc-500 uppercase tracking-wide shrink-0">
        {!isInline ? (
          <>
            <div className="flex-1 px-4 py-1 border-r border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-100/50 dark:bg-zinc-900/50">
              <div className="w-[60px] opacity-0 pointer-events-none" />
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Original Version</span>
              <div className="flex gap-1 w-[60px] justify-end">
                <Tooltip content="Undo Original"><button onClick={() => diffRef.current?.undoOriginal()} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition text-zinc-500 dark:text-zinc-400" title=""><Undo2 size={14}/></button></Tooltip>
                <Tooltip content="Redo Original"><button onClick={() => diffRef.current?.redoOriginal()} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition text-zinc-500 dark:text-zinc-400" title=""><Redo2 size={14}/></button></Tooltip>
              </div>
            </div>
            <div className="flex-1 px-4 py-1 flex justify-between items-center bg-zinc-100/50 dark:bg-zinc-900/50">
              <div className="w-[60px] opacity-0 pointer-events-none" />
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Modified Version <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded text-[10px] tracking-widest hidden sm:inline">OUTPUT</span></span>
              <div className="flex gap-1 w-[60px] justify-end">
                <Tooltip content="Undo Modified"><button onClick={() => diffRef.current?.undoModified()} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition text-blue-600 dark:text-blue-400" title=""><Undo2 size={14}/></button></Tooltip>
                <Tooltip content="Redo Modified"><button onClick={() => diffRef.current?.redoModified()} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition text-blue-600 dark:text-blue-400" title=""><Redo2 size={14}/></button></Tooltip>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 px-4 py-1 flex justify-between items-center bg-zinc-100/50 dark:bg-zinc-900/50">
            <div className="w-[60px] opacity-0 pointer-events-none" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Inline Diff View</span>
            <div className="flex gap-1 w-[60px] justify-end">
              <Tooltip content="Undo Modified"><button onClick={() => diffRef.current?.undoModified()} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition text-blue-600 dark:text-blue-400" title=""><Undo2 size={14}/></button></Tooltip>
              <Tooltip content="Redo Modified"><button onClick={() => diffRef.current?.redoModified()} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition text-blue-600 dark:text-blue-400" title=""><Redo2 size={14}/></button></Tooltip>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 w-full h-full relative">
        <DiffViewer 
          ref={diffRef}
          original={original} 
          modified={modified} 
          language={language} 
          isInline={isInline} 
          theme={editorTheme}
          ignoreWhitespace={ignoreWhitespace}
          wordWrap={wordWrap}
          lineNumbers={lineNumbers}
          fontSize={fontSize}
          onDiffUpdate={setDiffStats}
        />
      </div>

      <StatusBar 
        stats={diffStats} 
        isFullscreen={isFullscreen} 
        toggleFullscreen={handleToggleFullscreen}
        language={language}
      />

      {/* Manual Block Resolution Modal Popup */}
      {activeConflict && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-zinc-800 dark:text-zinc-200"><GitMerge size={18}/> Manual Block Resolution</h3>
              <button onClick={() => setActiveConflict(null)} className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition">
                  <X size={18} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex flex-col h-full">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Original Context</label>
                  <pre className="flex-1 p-3 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-300 rounded border border-red-200 dark:border-red-900/50 text-[13px] overflow-auto max-h-64 font-mono whitespace-pre-wrap">{activeConflict.originalText || "(Empty Segment)"}</pre>
              </div>
              <div className="flex flex-col h-full">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Current Modified Context</label>
                  <pre className="flex-1 p-3 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-900/50 text-[13px] overflow-auto max-h-64 font-mono whitespace-pre-wrap">{activeConflict.modifiedText || "(Empty Segment)"}</pre>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-green-600 dark:text-green-500 uppercase tracking-wider">Final Resolution Output</label>
                <div className="flex gap-2">
                  <button onClick={() => setResolutionText(activeConflict.originalText)} className="text-xs px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">Reset to Original</button>
                  <button onClick={() => setResolutionText(activeConflict.modifiedText)} className="text-xs px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">Reset to Modified</button>
                </div>
              </div>
              <textarea 
                  className="w-full min-h-[140px] p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-[13px] font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-y text-zinc-900 dark:text-zinc-200"
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  spellCheck={false}
              />
              <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setActiveConflict(null)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-sm font-medium transition">Cancel</button>
                  <button onClick={() => {
                    diffRef.current?.applyCustomEdit(activeConflict.modifiedRange, resolutionText);
                    setActiveConflict(null);
                  }} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition shadow flex items-center gap-2">
                    <Check size={16}/> Apply Exact Block
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
