import { useEffect } from "react";

interface SEOHeadProps {
  /** Canonical path starting with "/" (e.g. "/events"). The full URL will be built with the canonical domain. */
  canonicalPath: string;
  /** Robots directive. Defaults to "index,follow" for public pages. */
  robots?: "index,follow" | "noindex,nofollow" | "noindex,follow" | "index,nofollow";
}

const CANONICAL_ORIGIN = "https://fomo.com.cy";

/**
 * Lightweight SEO head manager — sets <link rel="canonical"> and <meta name="robots">
 * directly on document.head without external dependencies.
 *
 * Use only on public, indexable pages. Private/auth pages are already disallowed via robots.txt.
 */
const SEOHead = ({ canonicalPath, robots = "index,follow" }: SEOHeadProps) => {
  useEffect(() => {
    const fullUrl = `${CANONICAL_ORIGIN}${canonicalPath}`;

    // Canonical link
    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", fullUrl);

    // Robots meta
    let robotsEl = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robotsEl) {
      robotsEl = document.createElement("meta");
      robotsEl.setAttribute("name", "robots");
      document.head.appendChild(robotsEl);
    }
    robotsEl.setAttribute("content", robots);

    // og:url should match canonical
    let ogUrlEl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrlEl) {
      ogUrlEl = document.createElement("meta");
      ogUrlEl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrlEl);
    }
    ogUrlEl.setAttribute("content", fullUrl);
  }, [canonicalPath, robots]);

  return null;
};

export default SEOHead;
