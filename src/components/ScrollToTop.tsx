import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    const scrollNow = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    // Ensure we reset scroll even when transitions delay layout
    scrollNow();
    requestAnimationFrame(scrollNow);
    setTimeout(scrollNow, 0);
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
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    };

    document.addEventListener("click", handleClickCapture, true);
    return () => document.removeEventListener("click", handleClickCapture, true);
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToTop;

