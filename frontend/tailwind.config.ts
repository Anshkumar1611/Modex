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
        ink: "#0c0f14",
        mist: "#e8edf4",
        clinic: "#0d6b5c",
        clinicMuted: "#6b9a91",
        warn: "#c45c26",
        danger: "#b42318",
      },
    },
  },
  plugins: [],
} satisfies Config;
