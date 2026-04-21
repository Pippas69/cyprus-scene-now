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
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'charts-vendor';
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx') || id.includes('@ffmpeg')) return 'pdf-vendor';
          if (id.includes('@supabase')) return 'supabase-vendor';
          if (id.includes('@radix-ui')) return 'ui-vendor';
          if (id.includes('@tanstack')) return 'query-vendor';
          return undefined;
        },
      },
    },
  },
}));
