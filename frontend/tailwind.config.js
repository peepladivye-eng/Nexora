/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        og: {
          bg0: "#020611",
          bg1: "#050B16",
          bg2: "#07101F",
          primary: "#38bdf8",
          secondary: "#22d3ee",
          accent: "#60a5fa",
          sun: "#fb923c",
        },
        risk: {
          safe: "#22c55e",
          watch: "#eab308",
          medium: "#f97316",
          high: "#ef4444",
          critical: "#dc2626",
        },
      },
      fontFamily: {
        telemetry: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        ui: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-x': 'scanX 4s linear infinite',
        'float-slow': 'floatY 8s ease-in-out infinite',
      },
      keyframes: {
        scanX: {
          '0%,100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(100%)' },
        },
        floatY: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}
