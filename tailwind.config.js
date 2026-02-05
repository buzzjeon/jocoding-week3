/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#8BCF6B",
        "secondary": "#FFB347",
        "background-light": "#F7F9F5",
        "background-dark": "#0B0F10",
        "surface": "#12181A",
      },
      fontFamily: {
        "display": ["Sora", "sans-serif"]
      },
    },
  },
  plugins: [],
}
