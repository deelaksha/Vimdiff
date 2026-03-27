import { FilePlus2, FileMinus2, FileDiff, Maximize, Minimize, Code2 } from "lucide-react";

interface StatusBarProps {
  stats: { additions: number; deletions: number; changes: number };
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  language: string;
}

export function StatusBar({ stats, isFullscreen, toggleFullscreen, language }: StatusBarProps) {
  return (
    <div className="flex w-full bg-blue-600 dark:bg-blue-900 text-white text-xs px-4 py-1.5 justify-between items-center z-20 shrink-0 font-mono tracking-wide shadow-inner">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1.5 bg-blue-700 dark:bg-blue-950/50 px-2 py-0.5 rounded-sm" title="Total Conflicts">
          <FileDiff size={14} /> {stats.changes} CONFLICTS
        </span>
        <span className="flex items-center gap-1.5 text-green-300" title="Lines Added">
          <FilePlus2 size={14} /> {stats.additions} ADDED
        </span>
        <span className="flex items-center gap-1.5 text-red-300" title="Lines Removed">
          <FileMinus2 size={14} /> {stats.deletions} REMOVED
        </span>
      </div>
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1.5 text-blue-200">
          <Code2 size={14} /> {language.toUpperCase()}
        </span>
        <span className="text-blue-300 hidden sm:inline">UTF-8</span>
        <span className="font-bold tracking-widest text-blue-200 hidden md:inline">VIMDIFF.WEB PRO</span>
        <button 
          onClick={toggleFullscreen} 
          className="hover:text-white text-blue-200 transition bg-blue-700 dark:bg-blue-950/50 p-1 rounded-sm"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
      </div>
    </div>
  );
}
