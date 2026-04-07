import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const scrollEverythingToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const containers = document.querySelectorAll<HTMLElement>("[data-scroll-container]");
  containers.forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
};

/**
 * Detect if the software keyboard is likely open.
 * On iOS/Android, when keyboard opens, visualViewport.height shrinks
 * significantly compared to window.innerHeight.
 */
const isKeyboardOpen = (): boolean => {
  if (!window.visualViewport) return false;
  // If visual viewport is more than 150px smaller than the window, keyboard is open
  const heightDiff = window.innerHeight - window.visualViewport.height;
  return heightDiff > 150;
};

const applyViewportHeight = () => {
  // Don't update --app-dvh when keyboard is open — this prevents the black gap
  if (isKeyboardOpen()) return;
  const viewportHeight = window.innerHeight;
  document.documentElement.style.setProperty("--app-dvh", `${viewportHeight}px`);
};

const resetViewportAndScroll = () => {
  applyViewportHeight();
  scrollEverythingToTop();
};

const scheduleViewportReset = () => {
  resetViewportAndScroll();
  requestAnimationFrame(resetViewportAndScroll);
  window.setTimeout(resetViewportAndScroll, 0);
  window.setTimeout(resetViewportAndScroll, 120);
  window.setTimeout(resetViewportAndScroll, 300);
};

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    scheduleViewportReset();
  }, [location.key, location.pathname, location.search, location.hash]);

  useEffect(() => {
    const handleClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const sameRoute =
        url.pathname === location.pathname &&
        url.search === location.search &&
        url.hash === location.hash;

      if (sameRoute) {
        scheduleViewportReset();
      }
    };

    const handlePageResume = () => {
      scheduleViewportReset();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleViewportReset();
      }
    };

    const handleViewportResize = () => {
      applyViewportHeight();
    };

    // When keyboard closes (focus leaves input), recalculate after a short delay
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        // Delay to let keyboard fully close before recalculating
        window.setTimeout(applyViewportHeight, 100);
        window.setTimeout(applyViewportHeight, 300);
        window.setTimeout(applyViewportHeight, 500);
      }
    };

    document.addEventListener("click", handleClickCapture, true);
    window.addEventListener("pageshow", handlePageResume);
    window.addEventListener("focus", handlePageResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleViewportResize);
    window.visualViewport?.addEventListener("resize", handleViewportResize);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("click", handleClickCapture, true);
      window.removeEventListener("pageshow", handlePageResume);
      window.removeEventListener("focus", handlePageResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleViewportResize);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToTop;
