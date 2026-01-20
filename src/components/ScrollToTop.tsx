import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const scrollEverythingToTop = () => {
  // Window scroll
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  // Document scroll roots (some mobile browsers / embedded webviews)
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // App internal scroll containers (e.g. UserLayout main)
  const containers = document.querySelectorAll<HTMLElement>("[data-scroll-container]");
  containers.forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
};

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Ensure we reset scroll even when transitions delay layout/mounting
    scrollEverythingToTop();
    requestAnimationFrame(scrollEverythingToTop);
    setTimeout(scrollEverythingToTop, 0);
    setTimeout(scrollEverythingToTop, 50);
  }, [location.key, location.pathname, location.search, location.hash]);

  useEffect(() => {
    // If the user clicks a link to the SAME route, React Router may not navigate.
    // Still, we want to force scroll-to-top.
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
        scrollEverythingToTop();
      }
    };

    document.addEventListener("click", handleClickCapture, true);
    return () => document.removeEventListener("click", handleClickCapture, true);
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToTop;

