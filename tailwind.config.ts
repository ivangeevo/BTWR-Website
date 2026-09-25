import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chrome: {
          light: "#e0f1fb",
          DEFAULT: "#1e97d7",
          dark: "#135e86",
        },
        frost: "#f3f9fc",
        glow: "#22d3ee",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "ui-sans-serif", "system-ui", "sans-serif"],
        // The Outpost's Minecraft-style advancements (tabs, cards, toasts).
        pixel: ["var(--font-pixel)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
