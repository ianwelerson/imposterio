import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#f8f9fb",
        accent: {
          DEFAULT: "#4f46e5",
          light: "#eef2ff",
          hover: "#4338ca",
        },
        "brasil-green": "#009739",
      },
      fontSize: {
        "data": ["0.875rem", { lineHeight: "1.25rem" }],
        "body": ["1rem", { lineHeight: "1.5rem" }],
      },
      borderWidth: {
        "subtle": "0.5px",
      },
    },
  },
  plugins: [],
}

export default config
