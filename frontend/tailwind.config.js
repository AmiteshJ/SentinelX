/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "sx-black": "#05070a",
        "sx-blue": "#3aa0ff",
        "sx-blue-glow": "#5fc2ff",
        "sx-gold": "#c9973a",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
