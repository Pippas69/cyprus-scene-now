import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry error monitoring (production only)
if (!window.location.hostname.includes("localhost")) {
  Sentry.init({
    dsn: "https://37587bc14a1cd62502d394583ecca155@o4511171955982336.ingest.de.sentry.io/4511172429152336",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance monitoring: capture 20% of transactions
    tracesSampleRate: 0.2,
    // Session replay: capture 5% normally, 100% on error
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    // Don't send PII by default
    sendDefaultPii: false,
    // Environment tag
    environment: window.location.hostname.includes("preview--") ? "preview" : "production",
  });
}

const PREVIEW_HOST_PATTERNS = ["lovableproject.com", "preview--"];
const CHUNK_RECOVERY_KEY = "__fomo_chunk_recovery__";
const CHUNK_RECOVERY_QUERY_PARAM = "__reload";

const getErrorMessage = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (typeof value === "object" && value && "message" in value) {
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }

  return "";
};

const isPreviewHost = () =>
  PREVIEW_HOST_PATTERNS.some((pattern) => window.location.hostname.includes(pattern));

const isChunkLoadError = (value: unknown) => {
  const message = getErrorMessage(value);

  return [
    "Failed to fetch dynamically imported module",
    "Importing a module script failed",
    "error loading dynamically imported module",
  ].some((fragment) => message.includes(fragment));
};

const cleanupRecoveryState = () => {
  sessionStorage.removeItem(CHUNK_RECOVERY_KEY);

  const url = new URL(window.location.href);
  if (!url.searchParams.has(CHUNK_RECOVERY_QUERY_PARAM)) return;

  url.searchParams.delete(CHUNK_RECOVERY_QUERY_PARAM);
  window.history.replaceState({}, "", url.toString());
};

const recoverFromChunkLoadError = async () => {
  if (sessionStorage.getItem(CHUNK_RECOVERY_KEY)) return;
  sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister().catch(() => false))
      );
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }
  } finally {
    const url = new URL(window.location.href);
    url.searchParams.set(CHUNK_RECOVERY_QUERY_PARAM, Date.now().toString());
    window.location.replace(url.toString());
  }
};

const setupServiceWorkerHandling = () => {
  if (!("serviceWorker" in navigator)) return;

  if (isPreviewHost()) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      void Promise.all(
        registrations.map((registration) => registration.unregister().catch(() => false))
      );
    });
    return;
  }

  navigator.serviceWorker.getRegistration("/sw.js").then((registration) => {
    if (registration) {
      registration.update().catch((error) => console.warn("[SW] Update check failed:", error));
    }
  });
};

const setupChunkRecovery = () => {
  window.addEventListener("error", (event) => {
    if (isChunkLoadError(event.error ?? event.message)) {
      void recoverFromChunkLoadError();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) {
      void recoverFromChunkLoadError();
    }
  });
};

cleanupRecoveryState();
setupServiceWorkerHandling();
setupChunkRecovery();

createRoot(document.getElementById("root")!).render(<App />);
