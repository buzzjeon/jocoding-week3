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
        "primary": "#6C63FF",
        "secondary": "#FF6B6B",
        "background-light": "#F5F3FF",
        "background-dark": "#0B0D1A",
        "surface": "#12152A",
        "accent": "#4ECDC4",
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "body": ["Manrope", "sans-serif"]
      },
    },
  },
  plugins: [],
}
