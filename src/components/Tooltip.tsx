import React from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: "bottom" | "bottom-right" | "bottom-left" | "top";
}

export function Tooltip({ children, content, position = "bottom" }: TooltipProps) {
  let posClass = "";
  let arrowClass = "";

  if (position === "bottom") {
    posClass = "top-[calc(100%+6px)] left-1/2 -translate-x-1/2";
    arrowClass = "bottom-full left-1/2 -translate-x-1/2 border-b-zinc-900 dark:border-b-zinc-100";
  } else if (position === "bottom-right") {
    posClass = "top-[calc(100%+6px)] right-0";
    arrowClass = "bottom-full right-4 border-b-zinc-900 dark:border-b-zinc-100";
  } else if (position === "bottom-left") {
    posClass = "top-[calc(100%+6px)] left-0";
    arrowClass = "bottom-full left-4 border-b-zinc-900 dark:border-b-zinc-100";
  }

  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className={`pointer-events-none absolute ${posClass} px-2 py-1 text-[11px] font-bold tracking-wide text-white bg-zinc-900 dark:text-zinc-900 dark:bg-zinc-100 rounded opacity-0 transition-opacity duration-200 group-hover:opacity-100 z-[100] whitespace-nowrap shadow-xl border border-zinc-800 dark:border-zinc-200 delay-150`}>
        {content}
        <div className={`absolute border-4 border-transparent ${arrowClass}`} />
      </div>
    </div>
  );
}
