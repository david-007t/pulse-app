import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0F",
        primary: "#7C3AED",
        accent: "#EC4899",
        text: "#F1F5F9",
        subtext: "#94A3B8",
        surface: "#13131A",
        border: "#1E1E2E",
      },
    },
  },
  plugins: [],
};
export default config;
