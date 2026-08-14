import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0C",
        surface: "#17171A",
        border: "#2A2A2E",
        gold: "#D4AF6A",
        "gold-dark": "#B8944F",
        ink: "#F4F4F2",
        muted: "#9A9A9E",
        danger: "#E5484D",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
