"use client";

import { useEffect, useState, useCallback } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
  cursor?: boolean;
  tag?: "h1" | "h2" | "h3" | "p" | "span";
  style?: React.CSSProperties;
}

export default function TypewriterText({
  text,
  speed = 40,
  delay = 0,
  className = "",
  onComplete,
  cursor = true,
  tag: Tag = "span",
  style,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  const startTyping = useCallback(() => setStarted(true), []);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(startTyping, delay);
      return () => clearTimeout(timer);
    } else {
      setStarted(true);
    }
  }, [delay, startTyping]);

  useEffect(() => {
    if (!started) return;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [started, text, speed, onComplete]);

  return (
    <Tag className={`${className} relative`} style={style}>
      <span>{displayed}</span>
      {cursor && !done && started && (
        <span
          className="inline-block w-[1.5px] h-[0.85em] align-middle ml-[2px] translate-y-[-0.05em]"
          style={{
            background: "rgba(139,108,246,0.8)",
            animation: "cursor-blink 1s step-end infinite",
          }}
        />
      )}
    </Tag>
  );
}
