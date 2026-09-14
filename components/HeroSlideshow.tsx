"use client";

import { useEffect, useState } from "react";

const IMAGES = [
  "/hero-images/hero1.webp",
  "/hero-images/hero2.webp",
  "/hero-images/hero3.webp",
  "/hero-images/hero4.webp",
  "/hero-images/hero5.webp",
  "/hero-images/hero6.webp",
];

const HOLD_MS = 6000;
const FADE_MS = 1800;

// Crossfades between hero screenshots behind the hero copy: each image
// holds, then slowly fades into the next rather than cutting/flickering
// between them. Two stacked layers swap which one is "on top" so the
// incoming image fades in over the outgoing one at the same time.
export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, HOLD_MS);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 -z-20 overflow-hidden">
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === index ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}
