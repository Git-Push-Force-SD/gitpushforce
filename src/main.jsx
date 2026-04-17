import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Set Vite environment variables on globalThis for compatibility
globalThis.__VITE_SUPABASE_URL__ = import.meta.env.VITE_SUPABASE_URL;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
