import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        sans: ["var(--font-dm)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#0a0d12",
        mist: "#f4f6f9",
        clinic: "#0a5c52",
        clinicLight: "#e6f4f1",
        clinicMuted: "#5c8f87",
        warn: "#c2410c",
        warnLight: "#fff7ed",
        danger: "#b91c1c",
        surface: "#ffffff",
        line: "rgba(10, 13, 18, 0.08)",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(10, 13, 18, 0.06), 0 8px 24px -8px rgba(10, 13, 18, 0.1)",
        lift: "0 4px 12px -4px rgba(10, 13, 18, 0.08), 0 16px 40px -16px rgba(10, 13, 18, 0.14)",
        seat: "0 1px 2px rgba(10, 13, 18, 0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out forwards",
        shimmer: "shimmer 1.2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
