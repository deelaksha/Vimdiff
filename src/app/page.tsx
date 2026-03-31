"use client";

import { useState, useRef, useEffect } from "react";
import { Toolbar } from "@/components/Toolbar";
import { DiffViewer, DiffViewerRef, ConflictData } from "@/components/DiffViewer";
import { StatusBar } from "@/components/StatusBar";
import { Tooltip } from "@/components/Tooltip";
import { createPatch } from "diff";
import { GitMerge, ChevronUp, ChevronDown, ArrowRight, ArrowLeft, Check, X, Edit2, Undo2, Redo2, ArrowRightToLine, PlusCircle, Wand2 } from "lucide-react";

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
  const [language, setLanguage] = useState("plaintext");
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isMergingAll, setIsMergingAll] = useState(false);

  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // --- AI States ---
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [aiChatInput, setAiChatInput] = useState("");
  
  // AI Merge All States
  const [isAIMergeAllModalOpen, setIsAIMergeAllModalOpen] = useState(false);
  const [aiProposedText, setAiProposedText] = useState("");

  // AI Step-by-Step States
  const [isAIStepModalOpen, setIsAIStepModalOpen] = useState(false);
  const [aiConflicts, setAiConflicts] = useState<ConflictData[]>([]);
  const [aiCurrentConflictIndex, setAiCurrentConflictIndex] = useState(0);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "amma") {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleAIMergeAll = async (isRetry?: boolean) => {
    if (!diffRef.current) return;
    const currentTextToSend = isRetry ? aiProposedText : "";
    setIsAILoading(true);
    setAiError(null);
    if (!isRetry) setAiChatInput("");
    try {
      const res = await fetch("/api/ai-merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "all",
          language,
          originalText: diffRef.current.getOriginalContent(),
          modifiedText: diffRef.current.getModifiedContent(),
          userInstruction: isRetry ? aiChatInput : "",
          currentMergedText: currentTextToSend
        })
      });
      const data = await res.json();
      if (!res.ok) {
         setAiError(data.error || "AI Merge failed.");
         if (data.proposed) setAiProposedText(data.proposed); // still provide proposed for error preview if desired
      } else {
         setAiProposedText(data.mergedContent);
         setIsEditingResolution(false);
         setIsAIMergeAllModalOpen(true);
      }
    } catch (e: any) {
      setAiError("Request failed: " + e.message);
    }
    setIsAILoading(false);
  };

  const startAIStepByStep = () => {
    if (!diffRef.current) return;
    const conflicts = diffRef.current.getAllConflicts();
    if (conflicts.length === 0) {
      alert("No conflicts left to merge!");
      return;
    }
    setAiConflicts(conflicts);
    setAiCurrentConflictIndex(0);
    setIsAIStepModalOpen(true);
    fetchAIStep(conflicts[0]);
  };

  const fetchAIStep = async (conflict: ConflictData, isRetry?: boolean) => {
    const currentTextToSend = isRetry ? aiProposedText : "";
    setIsAILoading(true);
    setAiError(null);
    setAiProposedText(""); // clearing previous
    setIsEditingResolution(false);
    if (!isRetry) setAiChatInput("");
    try {
      // getting some context from around the range
      const diffEditor = diffRef.current?.getModifiedContent() || "";
      const lines = diffEditor.split('\n');
      const startContext = Math.max(0, conflict.modifiedRange.startLineNumber - 10);
      const endContext = Math.min(lines.length, conflict.modifiedRange.endLineNumber + 10);
      const context = lines.slice(startContext, endContext).join('\n');

      const res = await fetch("/api/ai-merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "single",
          language,
          originalText: conflict.originalText,
          modifiedText: conflict.modifiedText,
          context: context,
          userInstruction: isRetry ? aiChatInput : "",
          currentMergedText: currentTextToSend
        })
      });
      const data = await res.json();
      if (!res.ok) {
         setAiError(data.error || "AI step block merge failed.");
      } else {
         setAiProposedText(data.mergedContent);
      }
    } catch (e: any) {
      setAiError("Request failed: " + e.message);
    }
    setIsAILoading(false);
  };

  const startAISolveCurrent = () => {
    if (!diffRef.current) return;
    const data = diffRef.current.getConflictDataAtPos();
    if (!data) {
      alert("Please click inside a conflict area first before using AI Solve Current.");
      return;
    }
    setAiConflicts([data]);
    setAiCurrentConflictIndex(0);
    setIsAIStepModalOpen(true);
    fetchAIStep(data);
  };

  const handleAIStepAccept = () => {
    if (!diffRef.current || !aiConflicts[aiCurrentConflictIndex]) return;
    diffRef.current.applyCustomEdit(aiConflicts[aiCurrentConflictIndex].modifiedRange, aiProposedText);
    advanceAIStep();
  };

  const advanceAIStep = () => {
    const nextIndex = aiCurrentConflictIndex + 1;
    if (nextIndex < aiConflicts.length) {
      setAiCurrentConflictIndex(nextIndex);
      fetchAIStep(aiConflicts[nextIndex]);
    } else {
      setIsAIStepModalOpen(false);
    }
  };

  const renderHighlightedResolution = (text: string, originalContent: string, modifiedContent: string) => {
    if (aiError) return <div className="text-red-500 font-mono text-sm p-4">{aiError}</div>;
    
    const orgLines = new Set(originalContent.split('\n').map(l => l.trim()).filter(Boolean));
    const modLines = new Set(modifiedContent.split('\n').map(l => l.trim()).filter(Boolean));

    return (
      <div 
         className="w-full min-h-[140px] max-h-[40vh] p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded text-[13px] font-mono overflow-auto cursor-text text-zinc-800 dark:text-zinc-200" 
         onClick={() => setIsEditingResolution(true)}
         title="Click to edit manually"
      >
        {text.split('\n').map((line, i) => {
           const trimmed = line.trim();
           let className = "px-1 rounded-sm ";
           if (!trimmed) {
              // empty
           } else if (orgLines.has(trimmed) && modLines.has(trimmed)) {
              className += "opacity-80";
           } else if (orgLines.has(trimmed)) {
              className += "text-red-800 dark:text-red-300 bg-red-100/60 dark:bg-red-900/40";
           } else if (modLines.has(trimmed)) {
              className += "text-blue-800 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/40";
           } else {
              className += "text-green-800 dark:text-green-300 bg-green-100/60 dark:bg-green-900/40 font-medium";
           }
           return <div key={i} className={className}>{line || " "}</div>;
        })}
      </div>
    );
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

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
        <form onSubmit={handleLogin} className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-xl w-[380px] border border-zinc-200 dark:border-zinc-800 flex flex-col gap-4">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-1">VimDiff<span className="text-blue-500">.web</span></h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Enter password to access application</p>
          </div>
          <div>
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Password"
              autoFocus
            />
            {passwordError && <p className="text-red-500 text-xs mt-2 font-medium">Incorrect password. Please try again.</p>}
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors">
            Login
          </button>
        </form>
      </div>
    );
  }

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
      
      {validationError && (
        <div className="bg-red-100 dark:bg-red-900/30 border-b border-red-300 dark:border-red-800 px-4 py-2 flex items-center justify-between text-sm text-red-800 dark:text-red-300 shrink-0 z-20 shadow-sm relative">
          <div className="flex items-center gap-2">
            <X size={16} className="text-red-600 dark:text-red-400" />
            <strong className="font-semibold">Invalid Merge:</strong>
            <span className="font-mono bg-red-200/50 dark:bg-red-950/50 px-1 py-0.5 rounded">{validationError}</span>
            <span className="ml-2 text-xs opacity-80">(Added code must be placed within existing structure)</span>
          </div>
          <button onClick={() => setValidationError(null)} className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded transition"><X size={14}/></button>
        </div>
      )}

      {aiError && !isAIMergeAllModalOpen && !isAIStepModalOpen && (
        <div className="bg-red-100 dark:bg-red-900/30 border-b border-red-300 dark:border-red-800 px-4 py-2 flex items-center justify-between text-sm text-red-800 dark:text-red-300 shrink-0 z-20 shadow-sm relative">
          <div className="flex items-center gap-2">
            <X size={16} className="text-red-600 dark:text-red-400" />
            <strong className="font-semibold">AI Merge Error:</strong>
            <span className="font-mono bg-red-200/50 dark:bg-red-950/50 px-1 py-0.5 rounded ml-2 truncate max-w-[60vw]" title={aiError}>{aiError}</span>
          </div>
          <button onClick={() => setAiError(null)} className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded transition"><X size={14}/></button>
        </div>
      )}

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
         <button onClick={startAISolveCurrent} className="px-3 py-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800/80 hover:bg-violet-200 dark:hover:bg-violet-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap" title="Use AI to automatically resolve ONLY the conflict currently under your cursor">
            <Wand2 size={14} /> AI Solve Current
         </button>
         <button onClick={() => diffRef.current?.acceptCurrentChunkRight()} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 hover:bg-amber-200 dark:hover:bg-amber-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap">
            <ArrowLeft size={14} /> Accept Modified (Right {'->'} Left)
         </button>
         <button onClick={() => diffRef.current?.appendCurrentChunkRight()} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800/80 hover:bg-orange-200 dark:hover:bg-orange-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap" title="Keep original code but append the modified code below it">
            <PlusCircle size={14} /> Keep Both (Append Modified)
         </button>
         <button onClick={() => diffRef.current?.acceptCurrentChunkLeft()} className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800/80 hover:bg-green-200 dark:hover:bg-green-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap">
            <ArrowRight size={14} /> Accept Original Block
         </button>
         <button onClick={() => diffRef.current?.acceptCurrentLineLeft()} className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap">
            <ArrowRightToLine size={14} /> Accept Single Line
         </button>
         <button onClick={() => diffRef.current?.appendCurrentChunkLeft()} className="px-3 py-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800/80 hover:bg-teal-200 dark:hover:bg-teal-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap" title="Keep modified code but prepend the original code above it">
            <PlusCircle size={14} /> Keep Both (Prepend Original)
         </button>
         <button onClick={() => diffRef.current?.acceptAllKeepBoth()} className="px-3 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-300 dark:border-fuchsia-800/80 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap" title="Automatically keep both versions for all conflicts without losing any lines">
            <Wand2 size={14} /> Merge All (Keep Both)
         </button>
         <button 
           disabled={isAILoading}
           onClick={() => handleAIMergeAll()} 
           className={`px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/80 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap ${isAILoading ? 'opacity-50' : ''}`} 
           title="Autonomously resolve all conflicts intelligently using Gemini AI"
         >
            <Wand2 size={14} /> 🧠 AI Merge All
         </button>
         <button 
           disabled={isAILoading}
           onClick={startAIStepByStep} 
           className={`px-3 py-1 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/80 hover:bg-cyan-200 dark:hover:bg-cyan-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap ${isAILoading ? 'opacity-50' : ''}`} 
           title="Step through each conflict and automatically resolve using Gemini AI"
         >
            <GitMerge size={14} /> 🧠 AI Step-by-Step
         </button>
         {["makefile", "python", "go", "xml"].includes(language) && (
           <button 
             disabled={isMergingAll}
             onClick={async () => {
               setIsMergingAll(true);
               setValidationError(null);
               const res = await diffRef.current?.singleMergeAll(language);
               if (res && !res.success) {
                  setValidationError(res.error || "Validation failed");
               }
               setIsMergingAll(false);
             }} 
             className={`px-3 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/80 hover:bg-rose-200 dark:hover:bg-rose-800/60 rounded transition shadow-sm flex items-center gap-1 font-medium whitespace-nowrap ${isMergingAll ? "opacity-50 cursor-not-allowed" : ""}`} 
             title="Append all new unique lines from modified to the end of original base"
           >
              <PlusCircle size={14} /> {isMergingAll ? "Validating..." : "Single Merge All"}
           </button>
         )}
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

      {/* AI Modals */}
      {isAIMergeAllModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 h-[80vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><Wand2 size={18}/> AI Proposed Total Merge</h3>
              <button onClick={() => setIsAIMergeAllModalOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition">
                  <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-4 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden flex flex-col">
               <div className="flex items-center justify-between mb-2">
                 <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Review AI generated resolved code</label>
                 <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-800">
                    <button onClick={() => setIsEditingResolution(false)} className={`text-xs px-3 py-1 rounded transition-colors ${!isEditingResolution ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-锌-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Highlighted Preview</button>
                    <button onClick={() => setIsEditingResolution(true)} className={`text-xs px-3 py-1 rounded transition-colors ${isEditingResolution ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Edit Manually</button>
                 </div>
               </div>
               
               {!isEditingResolution ? (
                 renderHighlightedResolution(aiProposedText, diffRef.current?.getOriginalContent() || "", diffRef.current?.getModifiedContent() || "")
               ) : (
                 <textarea 
                    className="flex-1 w-full p-3 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded text-[13px] font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-zinc-800 dark:text-zinc-200 transition-colors"
                    value={aiProposedText}
                    onChange={(e) => setAiProposedText(e.target.value)}
                    spellCheck={false}
                 />
               )}
            </div>
            
            <div className="px-4 pb-2 bg-white dark:bg-zinc-950 flex gap-2">
               <input 
                 type="text" 
                 placeholder="Instruct AI on how to adjust this file..." 
                 className="flex-1 px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 value={aiChatInput}
                 onChange={(e) => setAiChatInput(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter' && aiChatInput.trim() && !isAILoading) handleAIMergeAll(true); }}
                 disabled={isAILoading}
               />
               <button onClick={() => handleAIMergeAll(true)} disabled={isAILoading || !aiChatInput.trim()} className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 rounded-md text-sm font-medium transition">
                 {isAILoading ? "Wait..." : "Update"}
               </button>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-end gap-3">
               <button onClick={() => setIsAIMergeAllModalOpen(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-sm font-medium transition">Discard</button>
               <button onClick={() => {
                   diffRef.current?.setModifiedContent(aiProposedText);
                   setIsAIMergeAllModalOpen(false);
               }} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition shadow flex items-center gap-2">
                 <Check size={16}/> Accept & Apply to Editor
               </button>
            </div>
          </div>
        </div>
      )}

      {isAIStepModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                <Wand2 size={18}/> AI Conflict Resolution ({aiCurrentConflictIndex + 1} of {aiConflicts.length})
              </h3>
              <button onClick={() => setIsAIStepModalOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition border-none">
                  <X size={18} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex flex-col h-full">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Original Context</label>
                  <pre className="flex-1 p-3 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-300 rounded border border-red-200 dark:border-red-900/50 text-[13px] overflow-auto max-h-48 font-mono whitespace-pre-wrap">{aiConflicts[aiCurrentConflictIndex]?.originalText || "(Empty Segment)"}</pre>
              </div>
              <div className="flex flex-col h-full">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Current Modified Context</label>
                  <pre className="flex-1 p-3 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-900/50 text-[13px] overflow-auto max-h-48 font-mono whitespace-pre-wrap">{aiConflicts[aiCurrentConflictIndex]?.modifiedText || "(Empty Segment)"}</pre>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">AI Proposed Resolution</label>
                  <span className="text-[10px] text-zinc-500">
                     <span className="text-red-500">Red:</span> Original | <span className="text-blue-500">Blue:</span> Modified | <span className="text-green-500">Green:</span> Merged/New
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {isAILoading && <span className="text-xs text-zinc-500 animate-pulse">Generating resolution...</span>}
                  <div className="flex bg-zinc-100 dark:bg-zinc-800/80 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-700">
                     <button onClick={() => setIsEditingResolution(false)} className={`text-[11px] px-2.5 py-1 rounded transition-colors ${!isEditingResolution ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Preview</button>
                     <button onClick={() => setIsEditingResolution(true)} className={`text-[11px] px-2.5 py-1 rounded transition-colors ${isEditingResolution ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Edit</button>
                  </div>
                </div>
              </div>
              
              {!isEditingResolution ? (
                 renderHighlightedResolution(aiProposedText, aiConflicts[aiCurrentConflictIndex]?.originalText || "", aiConflicts[aiCurrentConflictIndex]?.modifiedText || "")
              ) : (
                 <textarea 
                    className="w-full min-h-[140px] p-3 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded text-[13px] font-mono focus:ring-2 focus:ring-cyan-500 outline-none resize-y text-zinc-900 dark:text-zinc-200 transition-colors"
                    value={aiProposedText}
                    onChange={(e) => setAiProposedText(e.target.value)}
                    disabled={isAILoading || !!aiError}
                    spellCheck={false}
                 />
              )}
              
              <div className="mt-3 flex gap-2">
                 <input 
                   type="text" 
                   placeholder="Instruct AI to adjust this block..." 
                   className="flex-1 px-3 py-1.5 text-[13px] rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                   value={aiChatInput}
                   onChange={(e) => setAiChatInput(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter' && aiChatInput.trim() && !isAILoading && aiConflicts[aiCurrentConflictIndex]) fetchAIStep(aiConflicts[aiCurrentConflictIndex], true); }}
                   disabled={isAILoading}
                 />
                 <button onClick={() => { if (aiConflicts[aiCurrentConflictIndex]) fetchAIStep(aiConflicts[aiCurrentConflictIndex], true); }} disabled={isAILoading || !aiChatInput.trim()} className="px-3 py-1.5 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-800 disabled:opacity-50 rounded-md text-[13px] font-medium transition flex-shrink-0">
                   Update
                 </button>
              </div>

              <div className="flex justify-between items-center mt-4">
                  <button onClick={() => setIsAIStepModalOpen(false)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-sm font-medium transition">Cancel</button>
                  <div className="flex items-center gap-2">
                    <button onClick={advanceAIStep} disabled={isAILoading} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-sm font-medium transition disabled:opacity-50">Skip</button>
                    <button onClick={handleAIStepAccept} disabled={isAILoading || !!aiError} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-medium transition shadow flex items-center gap-2 disabled:opacity-50">
                      <Check size={16}/> Accept & Next
                    </button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
