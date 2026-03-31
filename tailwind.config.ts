import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coconala: {
          purple: "#5C35D9",
          "purple-light": "#EDE8FB",
          "purple-dark": "#3D1FA3",
          teal: "#00B4B4",
          "teal-light": "#E0F7F7",
          yellow: "#FF9500",
          "yellow-light": "#FFF3E0",
        },
        grade: {
          a: "#16a34a",
          "a-bg": "#F0FDF4",
          b: "#2563EB",
          "b-bg": "#EFF6FF",
          c: "#D97706",
          "c-bg": "#FFFBEB",
          d: "#DC2626",
          "d-bg": "#FEF2F2",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(92,53,217,0.12), 0 8px 32px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
