"use client";

import { useEffect, useRef, useState } from "react";

export default function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // threshold-based visibility (e.g. "10% of the element in view") gets
    // harder to reach the taller an element is — for a short card that's a
    // few px of scrolling, but for a long, content-heavy section (like the
    // Outpost, which keeps growing as tier 2 unlocks more of itself) it can
    // mean scrolling most of the way down the section before it even
    // reveals. Triggering off the top edge crossing into the viewport
    // instead keeps the reveal point constant regardless of how tall the
    // content underneath turns out to be.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
