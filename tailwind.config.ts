import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#fafafa",
        card: "#121212",
        "card-foreground": "#fafafa",
        muted: "#262626",
        "muted-foreground": "#737373",
        border: "#1f1f1f",
        input: "#1f1f1f",
        ring: "#16a34a",
        primary: {
          DEFAULT: "#16a34a",
          foreground: "#0a0a0a",
        },
        secondary: {
          DEFAULT: "#262626",
          foreground: "#fafafa",
        },
        success: "#16a34a",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#0ea5e9",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Courier New", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in",
        "slide-up": "slideUp 0.4s ease-out",
        "cursor-blink": "cursorBlink 1s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        cursorBlink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
