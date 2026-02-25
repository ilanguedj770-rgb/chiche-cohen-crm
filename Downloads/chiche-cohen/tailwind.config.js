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
          blue: '#1B3A6B',
          'blue-light': '#D6E4F0',
          'blue-mid': '#2E5FA3',
        }
      }
    },
  },
  plugins: [],
}
