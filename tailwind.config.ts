import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0C",
        surface: "#17171A",
        border: "#2A2A2E",
        gold: "#FF6766",
        "gold-dark": "#CA2851",
        marple: {
          1: "#CA2851",
          2: "#FF6766",
          3: "#FFB173",
          4: "#FFE3B3",
        },
        ink: "#F4F4F2",
        muted: "#9A9A9E",
        danger: "#E5484D",
      },
      backgroundImage: {
        "marple-gradient": "linear-gradient(90deg, #CA2851 0%, #FF6766 35%, #FFB173 70%, #FFE3B3 100%)",
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
