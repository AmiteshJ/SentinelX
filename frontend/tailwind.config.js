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
        heka: {
          "old-lace": "#fff5e6",
          "raisin-black": "#282937",
          "rhythm": "#6e7085",
          "salmon": "#fa8775",
          "cyber-grape": "#5b4080",
          "wine": "#802d3a",
          "hookers-green": "#557570",
          "floral-white": "#fefbf4",
          "independence": "#4a4b5e",
          "melon": "#faad9d",
          "unbleached-silk": "#fed3c6",
          "medium-purple": "#9d85f2",
          "salmon-pink": "#f28596",
          "magic-mint": "#7ee6c7",
          "linen": "#e7ded3",
          "timberwolf": "#cfc8c0",
          "dim-grey": "#888485",
          "sea-green": "#48b37c",
          "yellow-orange": "#ffaf46",
          "paradise-pink": "#e64570",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
