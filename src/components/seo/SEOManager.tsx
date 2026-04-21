import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const CANONICAL_ORIGIN = "https://fomo.com.cy";

/**
 * Public routes that should be indexed by search engines.
 * Maps the React Router path to the canonical URL path.
 * Only these routes get index,follow + canonical pointing to fomo.com.cy.
 *
 * All other routes (dynamic IDs, dashboards, auth-protected, view tokens)
 * either get noindex,nofollow or are skipped entirely (no canonical injected).
 */
const PUBLIC_INDEXABLE_ROUTES: Record<string, string> = {
  "/": "/",
  "/feed": "/feed",
  "/events": "/events",
  "/ekdiloseis": "/events", // alias → canonicalize to /events
  "/offers": "/offers",
  "/map": "/map",
  "/xartis": "/map", // alias → canonicalize to /map
  "/features": "/features",
  "/pricing": "/pricing",
  "/for-visitors": "/for-visitors",
  "/for-businesses": "/for-businesses",
  "/contact": "/contact",
  "/book-demo": "/book-demo",
  "/signup": "/signup",
  "/signup-business": "/signup-business",
  "/login": "/login",
  "/privacy": "/privacy",
  "/terms": "/terms",
  "/cookies": "/cookies",
  "/license": "/license",
};

/**
 * Route prefixes that must explicitly be marked noindex,nofollow.
 * (robots.txt also disallows these, but the meta tag is a defence-in-depth
 * signal in case the page is reached via direct link.)
 */
const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/dashboard-user",
  "/dashboard-business",
  "/dashboard-promoter",
  "/reset-password",
  "/forgot-password",
  "/ticket-view",
  "/reservation-view",
  "/offer-view",
  "/ticket-success",
  "/reservation-success",
  "/offer-purchase-success",
  "/messages",
  "/subscription-plans",
  "/verify-student",
  "/unsubscribe",
];

function setOrCreateMeta(selector: string, attr: string, attrValue: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setOrCreateLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function removeElement(selector: string) {
  const el = document.head.querySelector(selector);
  if (el) el.remove();
}

/**
 * Updates <link rel="canonical"> and <meta name="robots"> on every route change.
 * Mounted once at the app root inside <BrowserRouter>.
 */
const SEOManager = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const canonicalPath = PUBLIC_INDEXABLE_ROUTES[path];

    if (canonicalPath) {
      // Public, indexable page
      const fullUrl = `${CANONICAL_ORIGIN}${canonicalPath}`;
      setOrCreateLink("canonical", fullUrl);
      setOrCreateMeta('meta[name="robots"]', "name", "robots", "index,follow");
      setOrCreateMeta('meta[property="og:url"]', "property", "og:url", fullUrl);
      return;
    }

    const isPrivate = PRIVATE_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (isPrivate) {
      // Explicitly hide from search engines
      setOrCreateMeta('meta[name="robots"]', "name", "robots", "noindex,nofollow");
      // Remove canonical so we don't accidentally point search engines anywhere
      removeElement('link[rel="canonical"]');
      return;
    }

    // Dynamic / unknown routes (e.g. /event/:id, /business/:id, /offer/:id):
    // Allow indexing but don't inject a misleading canonical. Leave robots default.
    setOrCreateMeta('meta[name="robots"]', "name", "robots", "index,follow");
    removeElement('link[rel="canonical"]');
  }, [location.pathname]);

  return null;
};

export default SEOManager;
