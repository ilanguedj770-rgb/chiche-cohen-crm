/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cabinet: {
          blue: '#CC0000',
          'blue-light': '#FFD6D6',
          'blue-mid': '#FF3333',
        }
      }
    },
  },
  plugins: [],
}
