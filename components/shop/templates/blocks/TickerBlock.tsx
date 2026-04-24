"use client";

import { useEffect, useState } from "react";
import type { TickerBlockContent } from "@/lib/types/landing-blocks";
import { readContent } from "./_normalizeContent";

interface TickerBlockProps {
  content: TickerBlockContent | unknown;
  sticky?: boolean;
}

export default function TickerBlock({ content: rawContent, sticky }: TickerBlockProps) {
  const content = readContent<TickerBlockContent>(rawContent, "TICKER");
  const { mode, scrollingText, speed, endsAt, countdownLabel, bgColor, textColor } = content;
  const isSticky = sticky ?? content.sticky;

  const showScrolling = mode === "scrolling" || mode === "both";
  const showCountdown = mode === "countdown" || mode === "both";

  return (
    <div
      className={`z-40 w-full overflow-hidden text-sm font-medium select-none @container ${isSticky ? "sticky top-0" : ""}`}
      style={{ backgroundColor: bgColor ?? "#dc2626", color: textColor ?? "#ffffff" }}
    >
      <div className={`flex items-center h-10 ${mode === "both" ? "gap-6 px-4 justify-between" : "justify-center"}`}>
        {showScrolling && scrollingText && (
          <div className="overflow-hidden flex-1 min-w-0">
            <div
              className="flex animate-marquee"
              style={{ "--marquee-speed": `${Math.round(60000 / (speed ?? 30))}ms` } as React.CSSProperties}
            >
              {[0, 1].map((half) => (
                <div key={half} className="flex shrink-0" aria-hidden={half === 1 ? true : undefined}>
                  {Array(8).fill(scrollingText).map((text, i) => (
                    <span key={i} className="whitespace-nowrap px-6">{text}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {showCountdown && endsAt && (
          <Countdown endsAt={endsAt} label={countdownLabel} />
        )}
      </div>
    </div>
  );
}

function Countdown({ endsAt, label }: { endsAt: string; label?: string }) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(endsAt));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (timeLeft === null) return <span className="shrink-0">⏱ Finalizado</span>;

  const { days, hours, minutes, seconds } = timeLeft;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {label && <span className="opacity-90">{label}</span>}
      <div className="flex items-center gap-1 font-mono">
        {days > 0 && <Seg value={days} unit="d" />}
        <Seg value={hours} unit="h" />
        <Seg value={minutes} unit="m" />
        <Seg value={seconds} unit="s" />
      </div>
    </div>
  );
}

function Seg({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="bg-black/20 rounded px-1.5 py-0.5 tabular-nums">{String(value).padStart(2, "0")}</span>
      <span className="text-xs opacity-70">{unit}</span>
    </span>
  );
}

function calcTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSecs = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    minutes: Math.floor((totalSecs % 3600) / 60),
    seconds: totalSecs % 60,
  };
}
