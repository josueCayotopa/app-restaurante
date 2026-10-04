import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: solo en producción (en desarrollo interferiría con la recarga en caliente de Vite).
// Ojo: el navegador solo activa service workers en https o en localhost.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('[pwa] No se registró el service worker:', e))
  })
}
