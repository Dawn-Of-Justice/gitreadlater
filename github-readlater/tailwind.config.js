/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        github: {
          dark: '#24292e',
          light: '#f6f8fa',
          blue: '#0366d6',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    // ...other plugins
  ],
}