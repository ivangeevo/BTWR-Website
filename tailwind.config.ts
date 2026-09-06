import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chrome: {
          light: "#e0f2fe",
          DEFAULT: "#7dd3fc",
          dark: "#0369a1",
        },
      },
    },
  },
  plugins: [],
};

export default config;
