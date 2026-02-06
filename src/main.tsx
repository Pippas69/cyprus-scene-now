import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force Service Worker update on every page load (fixes stale SW on iOS Safari)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration('/sw.js').then((reg) => {
    if (reg) {
      reg.update().catch((err) => console.warn('[SW] Update check failed:', err));
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
