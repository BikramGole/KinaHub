import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'

// ─── Backend Pre-warmer ─────────────────────────────────────────────────────
// Render.com free tier spins down after 15 min inactivity (cold start = ~50s).
// Fire a /ping before React renders so the server wakes up while the user
// sees the page shell. This turns a visible 50s blank screen → a fast load.
(function prewarmBackend() {
  const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://kinahub.onrender.com');
  const PING_URL = `${API_BASE}/ping/`;
  const start = Date.now();

  function ping() {
    fetch(PING_URL, { method: 'GET', mode: 'cors', cache: 'no-store' })
      .then(() => {
        const ms = Date.now() - start;
        if (ms > 5000) {
          console.log(`[KinaHub] Backend woke up in ${(ms / 1000).toFixed(1)}s`);
        }
      })
      .catch(() => {
        // Silently retry once after 8s if the first ping fails
        setTimeout(() => fetch(PING_URL, { method: 'GET', mode: 'cors', cache: 'no-store' }).catch(() => {}), 8000);
      });
  }

  ping();
})();

// Global error handler for unhandled promise rejections and errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global] Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.error('[Global] Uncaught error:', event.error);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)

