import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/create-checkout-session': 'http://localhost:3000',
      '/checkout-session': 'http://localhost:3000',
      '/bookings': 'http://localhost:3000',
      '/mark-payment-complete':   'http://localhost:3000',
    }
  }
})