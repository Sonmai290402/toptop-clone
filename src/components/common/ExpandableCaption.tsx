"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "cn";

type ExpandableCaptionProps = {
  text: string;
  lines?: number;
  className?: string;
  textClassName?: string;
  expandedClassName?: string;
  buttonClassName?: string;
};

export default function ExpandableCaption(props: ExpandableCaptionProps) {
  // Reset expansion when the component receives a different caption.
  return <CaptionContent key={props.text} {...props} />;
}

function CaptionContent({ text, lines = 2, className, textClassName, expandedClassName, buttonClassName }: ExpandableCaptionProps) {
  const id = useId();
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const lineCount = Math.max(1, Math.floor(lines));

  useEffect(() => {
    const element = paragraph.current;
    if (!element) return;
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      setOverflows(element.scrollHeight > lineHeight * lineCount + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, lineCount]);

  if (!text) return null;

  return <div className={cn("min-w-0", className)}>
    <p ref={paragraph} id={id}
      className={cn("whitespace-pre-wrap wrap-anywhere text-sm leading-5", textClassName,
        expanded ? cn("max-h-60 overflow-y-auto overscroll-contain", expandedClassName) : "overflow-hidden")}
      style={expanded ? undefined : { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lineCount }}>
      {text}
    </p>
    {overflows && <button type="button" aria-expanded={expanded} aria-controls={id}
      onClick={event => { event.stopPropagation(); setExpanded(value => !value); }}
      className={cn("mt-1 rounded text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring", buttonClassName)}>
      {expanded ? "See less" : "See all"}
    </button>}
  </div>;
}
