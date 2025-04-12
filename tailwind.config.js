import { heroui } from "@heroui/theme";
import flowbiteReact from "flowbite-react/plugin/tailwindcss";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    ".flowbite-react/class-list.json",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        // Override the "background" color for your light theme.
        // Set this to your desired color.
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({ themes: { light: { colors: { background: "#f0f0f0" } } } }),
    flowbiteReact,
  ],
};

export default config;
