import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    hmr: {
      protocol: "wss",
      clientPort: 443,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          // IMPORTANT: React core must be in ONE chunk and resolved BEFORE
          // any vendor that depends on it (recharts, radix, etc.), otherwise
          // we hit "Cannot access 'S' before initialization" in production.
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('react-router') ||
            id.includes('/scheduler/') ||
            id.includes('/react-is/') ||
            id.includes('/use-sync-external-store/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('mapbox-gl')) return 'mapbox-vendor';
          // NOTE: charts (recharts/d3) and pdf (jspdf/html2canvas/xlsx) are
          // intentionally NOT in manualChunks — splitting them caused
          // "Cannot access 'P' before initialization" TDZ crashes due to
          // circular deps with prop-types/react-smooth/lodash. Let Rollup
          // merge them into the lazy route chunks that import them.
          if (id.includes('@supabase')) return 'supabase-vendor';
          if (id.includes('@radix-ui')) return 'ui-vendor';
          if (id.includes('@tanstack')) return 'query-vendor';
          return undefined;
        },
      },
    },
  },
}));
