import "./instrument";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { reactErrorHandler } from "@sentry/react";
import "./index.css";
import App from "./App.tsx";

// ─── Backend Pre-warmer ─────────────────────────────────────────────────────
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
        setTimeout(() => fetch(PING_URL, { method: 'GET', mode: 'cors', cache: 'no-store' }).catch(() => {}), 8000);
      });
  }

  ping();
})();

createRoot(document.getElementById("root")!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

