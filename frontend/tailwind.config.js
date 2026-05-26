/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A1A1A",
        cream: "#F4F0E8",
        card: "#FFFCF8",
        edge: "#C6BDAC",
        accent: "#BF6F34",
        deep: "#0F2A44",
        deeper: "#0A1E33",
        good: "#5FBE7A",
        warn: "#F4B183",
        bad: "#DC5A5A",
        term: {
          bg: "#0B0F14",
          dim: "#9AA4B2",
          ok: "#5FE39A",
          warn: "#F5C26B",
          bad: "#F47878",
          info: "#7FB3E0",
          accent: "#BF8F6F",
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "ui-monospace", "monospace"],
      },
      animation: {
        "border-beam": "border-beam 4s linear infinite",
        "shine": "shine 3s linear infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite",
        "caret": "caret 1s steps(1) infinite",
        "scan-line": "scan-line 2.5s linear infinite",
        "shimmer-slide": "shimmer-slide var(--speed,3s) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed,3s) * 2) infinite linear",
        "gradient": "gradient 8s linear infinite",
        "marquee": "marquee var(--duration,40s) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration,40s) linear infinite",
        "ripple": "ripple 3.4s ease calc(var(--i,0) * 0.2s) infinite",
      },
      keyframes: {
        "border-beam": {
          "0%":   { "offset-distance": "0%" },
          "100%": { "offset-distance": "100%" },
        },
        "shine": {
          "0%":   { "background-position": "0% 0%" },
          "100%": { "background-position": "-200% 0%" },
        },
        "pulse-ring": {
          "0%":   { transform: "scale(0.95)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "caret": {
          "0%,49%":  { opacity: "1" },
          "50%,100%": { opacity: "0" },
        },
        "scan-line": {
          "0%":   { transform: "translateY(0%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "shimmer-slide": {
          to: { transform: "translate(calc(100cqw - 100%), 0)" },
        },
        "spin-around": {
          "0%":   { transform: "translateZ(0) rotate(0)" },
          "15%,35%":  { transform: "translateZ(0) rotate(90deg)" },
          "65%,85%":  { transform: "translateZ(0) rotate(270deg)" },
          "100%": { transform: "translateZ(0) rotate(360deg)" },
        },
        "gradient": {
          to: { "background-position": "var(--bg-size, 300%) 0" },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(calc(-100% - var(--gap,1rem)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to:   { transform: "translateY(calc(-100% - var(--gap,1rem)))" },
        },
        "ripple": {
          "0%,100%": { transform: "translate(-50%,-50%) scale(1)" },
          "50%":     { transform: "translate(-50%,-50%) scale(0.9)" },
        },
      },
    },
  },
  plugins: [],
};
