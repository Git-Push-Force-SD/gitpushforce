/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#d4f1e4',
          100: '#a8e3ca',
          400: '#396447',
          500: '#396447',
          600: '#396447',
          700: '#0f5027',
        },
        dark: '#1b1b1b',
        light: '#f3f3f7',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1f7a3d 0%, #1b1b1b 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #1f7a3d 0%, #1b1b1b 50%, #2a9a52 100%)',
      }
    },
  },
  plugins: [],
}
