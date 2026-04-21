import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import { installSafeBrowserStorage, safeSessionStorage } from "@/lib/browserStorage";

// Initialize Sentry error monitoring (production only)
if (!window.location.hostname.includes("localhost")) {
  try {
    Sentry.init({
      dsn: "https://37587bc14a1cd62502d394583ecca155@o4511171955982336.ingest.de.sentry.io/4511172429152336",
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: false,
      environment: window.location.hostname.includes("preview--") ? "preview" : "production",
    });
  } catch (error) {
    console.warn("[bootstrap] Sentry init skipped:", error);
  }
}

const PREVIEW_HOST_PATTERNS = ["lovableproject.com", "preview--"];
const CHUNK_RECOVERY_KEY = "__fomo_chunk_recovery__";
const CHUNK_RECOVERY_QUERY_PARAM = "__reload";

const removeInlineSplash = () => {
  const splash = document.getElementById("inline-splash");
  if (!splash) return;

  splash.classList.add("fade-out");
  window.setTimeout(() => splash.remove(), 400);
};

const renderBootstrapError = () => {
  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#091E30;color:#FEFAF6;font-family:Inter,system-ui,sans-serif;text-align:center;">
      Η εφαρμογή δεν φόρτωσε. Κάνε ανανέωση της σελίδας.
    </div>
  `;
};

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
  safeSessionStorage.removeItem(CHUNK_RECOVERY_KEY);

  const url = new URL(window.location.href);
  if (!url.searchParams.has(CHUNK_RECOVERY_QUERY_PARAM)) return;

  url.searchParams.delete(CHUNK_RECOVERY_QUERY_PARAM);
  window.history.replaceState({}, "", url.toString());
};

const recoverFromChunkLoadError = async () => {
  // If a recovery already happened in this tab/URL, do not loop — show error UI instead.
  const url = new URL(window.location.href);
  if (
    safeSessionStorage.getItem(CHUNK_RECOVERY_KEY) ||
    url.searchParams.has(CHUNK_RECOVERY_QUERY_PARAM)
  ) {
    removeInlineSplash();
    renderBootstrapError();
    return;
  }
  safeSessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");

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
    if (!registration) return;

    registration.update().catch((error) => console.warn("[SW] Update check failed:", error));

    // When a new SW takes control, reload once so the page uses fresh assets
    let hasReloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    });

    // If a new SW is waiting, tell it to activate immediately
    const promoteWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
    };
    promoteWaiting(registration);
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          registration.waiting?.postMessage("SKIP_WAITING");
        }
      });
    });
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

const bootstrap = async () => {
  installSafeBrowserStorage();

  try {
    const { default: App } = await import("./App.tsx");

    createRoot(document.getElementById("root")!).render(
      <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh the page.</p>}>
        <App />
      </Sentry.ErrorBoundary>
    );
  } catch (error) {
    console.error("[bootstrap] Failed to start app:", error);
    removeInlineSplash();
    renderBootstrapError();
  }
};

void bootstrap();
