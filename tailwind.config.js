/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3cc973',
        'primary-hover': '#3cc973',
        dark: '#1b1b1b',
        'dark-muted': '#334155',
        'text-muted': '#4a4a4a',
        offwhite: '#ebebd3',
        light: '#f1f5f9',
      },
      fontFamily: {
        main: ['Inter', 'sans-serif'],
        display: ['Anton', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 15s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
