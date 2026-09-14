import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        marinho: "#1B3A66",
        ciano: "#229DCF",
        amarelo: "#FBC64B",
        rosa: "#E23D7D",
      },
    },
  },
  plugins: [],
};

export default config;
