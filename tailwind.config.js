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
        "primary": "#13c8ec",
        "background-light": "#f6f8f8",
        "background-dark": "#101f22",
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"]
      },
    },
  },
  plugins: [],
}
