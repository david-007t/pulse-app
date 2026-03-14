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
        background: "#0D0D1A",
        primary: "#7C3AED",
        accent: "#EC4899",
        text: "#FFFFFF",
        subtext: "#9CA3AF",
        surface: "#16162A",
        border: "#2A2A45",
      },
    },
  },
  plugins: [],
};
export default config;
