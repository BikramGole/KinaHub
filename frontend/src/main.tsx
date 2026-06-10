import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'

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
