"use client";

import { useTheme } from "next-themes";
import { Upload, Sun, Moon, Layout, Columns, Download, Trash2, ChevronUp, ChevronDown, ArrowRightLeft, ArrowRight, ArrowLeft, ClipboardCopy, Wand2, Text, WrapText, Hash, FileDown } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";

interface ToolbarProps {
  language: string;
  setLanguage: (lang: string) => void;
  isInline: boolean;
  setIsInline: (inline: boolean) => void;
  onOriginalUpload: (content: string) => void;
  onModifiedUpload: (content: string) => void;
  onClear: () => void;
  onExport: () => void;
  onNextDiff: () => void;
  onPrevDiff: () => void;
  editorTheme: string;
  setEditorTheme: (theme: string) => void;
  onSwap: () => void;
  onAcceptLeft: () => void;
  onAcceptRight: () => void;
  ignoreWhitespace: boolean;
  setIgnoreWhitespace: (val: boolean) => void;
  onFormatBoth: () => void;
  onCopyOriginal: () => void;
  onCopyModified: () => void;
  wordWrap: boolean;
  setWordWrap: (val: boolean) => void;
  lineNumbers: boolean;
  setLineNumbers: (val: boolean) => void;
  fontSize: number;
  setFontSize: (val: number) => void;
  onDownloadOriginal: () => void;
  onDownloadModified: () => void;
}

const LANGUAGES = [
  "plaintext", "python", "go", "xml", "makefile"
];

const EDITOR_THEMES = [
  { value: "vimdiff-dark", label: "VimDiff Dark" },
  { value: "vimdiff-light", label: "VimDiff Light" },
  { value: "vs-dark", label: "VS Dark" },
  { value: "vs-light", label: "VS Light" },
  { value: "dracula", label: "Dracula" },
  { value: "monokai", label: "Monokai" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "night-owl", label: "Night Owl" },
  { value: "vimdiff-purple", label: "VimDiff Purple" },
  { value: "vimdiff-blue", label: "VimDiff Blue" },
  { value: "vimdiff-black", label: "VimDiff OLED Black" }
];

export function Toolbar({
  language, setLanguage, isInline, setIsInline, onOriginalUpload, onModifiedUpload, onClear, onExport, onNextDiff, onPrevDiff,
  editorTheme, setEditorTheme, onSwap, onAcceptLeft, onAcceptRight, ignoreWhitespace, setIgnoreWhitespace, onFormatBoth, onCopyOriginal, onCopyModified,
  wordWrap, setWordWrap, lineNumbers, setLineNumbers, fontSize, setFontSize, onDownloadOriginal, onDownloadModified
}: ToolbarProps) {
  const { theme, setTheme } = useTheme();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (content: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") callback(result);
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 gap-4 overflow-x-auto">
      <div className="flex items-center gap-4 shrink-0">
        <h1 className="font-bold text-lg tracking-tight mr-4">VimDiff<span className="text-blue-500">.web</span></h1>
        
        {/* File Uploaders */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-md cursor-pointer transition-colors">
            <Upload size={16} />
            <span>Load Original</span>
            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, onOriginalUpload)} />
          </label>
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-md cursor-pointer transition-colors">
            <Upload size={16} />
            <span>Load Modified</span>
            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, onModifiedUpload)} />
          </label>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2 ml-2 border-l border-zinc-200 dark:border-zinc-800 pl-4 shrink-0">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-900 border-none rounded-md outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {LANGUAGES.map(lang => (
              <option key={lang} value={lang}>{lang.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Editor Theme Selector */}
        <div className="flex items-center gap-2 ml-1 sm:ml-2 sm:border-l border-zinc-200 dark:border-zinc-800 sm:pl-4 shrink-0">
          <select 
            value={editorTheme}
            onChange={(e) => setEditorTheme(e.target.value)}
            className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-900 border-none rounded-md outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {EDITOR_THEMES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Merge Actions */}
        <div className="flex items-center gap-1 ml-2 border-l border-zinc-200 dark:border-zinc-800 pl-4 shrink-0">
          <Tooltip content="Copy Original Content">
             <button onClick={onCopyOriginal} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500">
               <ClipboardCopy size={16} />
             </button>
          </Tooltip>
          <Tooltip content="Push Modified to Original (Right -> Left)">
            <button onClick={onAcceptRight} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors text-blue-600 dark:text-blue-400">
              <ArrowLeft size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Swap Panels">
            <button onClick={onSwap} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors">
              <ArrowRightLeft size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Push Original Block to Modified (Left -> Right)">
            <button onClick={onAcceptLeft} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors text-green-600 dark:text-green-400">
              <ArrowRight size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Copy Modified Content">
            <button onClick={onCopyModified} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500">
              <ClipboardCopy size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 border-t sm:border-none border-zinc-200 dark:border-zinc-800 pt-2 sm:pt-0">
        <div className="flex items-center gap-1 sm:mr-2 sm:border-r border-zinc-200 dark:border-zinc-800 sm:pr-4 shrink-0">
          <Tooltip content="Auto-Format Code">
            <button 
              onClick={onFormatBoth}
              className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-purple-600 dark:text-purple-400"
            >
              <Wand2 size={18} />
            </button>
          </Tooltip>
          <Tooltip content={ignoreWhitespace ? "Show Whitespace Differences" : "Ignore Whitespace Differences"}>
            <button 
              onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
              className={`p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${ignoreWhitespace ? "bg-zinc-200 dark:bg-zinc-800" : ""}`}
            >
              <Text size={18} />
            </button>
          </Tooltip>
          <Tooltip content={wordWrap ? "Word Wrap On" : "Word Wrap Off"}>
            <button 
              onClick={() => setWordWrap(!wordWrap)} 
              className={`p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${wordWrap ? "bg-zinc-200 dark:bg-zinc-800" : ""}`}
            >
              <WrapText size={18} />
            </button>
          </Tooltip>
          <Tooltip content={lineNumbers ? "Hide Line Numbers" : "Show Line Numbers"}>
            <button 
              onClick={() => setLineNumbers(!lineNumbers)} 
              className={`p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${lineNumbers ? "bg-zinc-200 dark:bg-zinc-800" : ""}`}
            >
              <Hash size={18} />
            </button>
          </Tooltip>
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-md overflow-hidden text-sm font-medium border border-zinc-200 dark:border-zinc-800 ml-1">
            <Tooltip content="Decrease Font Size"><button onClick={() => setFontSize(Math.max(8, fontSize - 1))} className="px-2 py-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition">-</button></Tooltip>
            <span className="px-2 py-1.5 border-x border-zinc-200 dark:border-zinc-800 w-8 text-center">{fontSize}</span>
            <Tooltip content="Increase Font Size"><button onClick={() => setFontSize(Math.min(36, fontSize + 1))} className="px-2 py-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition">+</button></Tooltip>
          </div>
        </div>

        <div className="flex items-center sm:border-r border-zinc-200 dark:border-zinc-800 sm:pr-2 sm:mr-2 gap-1 shrink-0">
           <Tooltip content="Download Original File">
             <button onClick={onDownloadOriginal} className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-md transition-colors">
               <FileDown size={14} /> Org
             </button>
           </Tooltip>
           <Tooltip content="Download Modified File">
             <button onClick={onDownloadModified} className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-md transition-colors">
               <FileDown size={14} /> Mod
             </button>
           </Tooltip>
        </div>

        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-md overflow-hidden mr-1 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <Tooltip content="Previous Change ([c)">
            <button 
              onClick={onPrevDiff}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border-r border-zinc-200 dark:border-zinc-800"
            >
              <ChevronUp size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Next Change (]c)">
            <button 
              onClick={onNextDiff}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronDown size={18} />
            </button>
          </Tooltip>
        </div>

        <Tooltip content={isInline ? "Switch to Side-by-Side View" : "Switch to Inline View"} position="bottom-right">
          <button 
            onClick={() => setIsInline(!isInline)}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors mr-1"
          >
            {isInline ? <Layout size={18} /> : <Columns size={18} />}
          </button>
        </Tooltip>

        <Tooltip content={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"} position="bottom-right">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </Tooltip>

        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        <Tooltip content="Clear Editors" position="bottom-right">
          <button 
            onClick={onClear}
            className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Export Patch File" position="bottom-right">
          <button 
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Patch</span>
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
