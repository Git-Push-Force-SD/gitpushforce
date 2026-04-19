import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/create-checkout-session': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})