import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
    // Split heavy map dependencies into their own chunks so the
    // initial Welcome splash doesn't have to ship 1.5MB of deck.gl
    // + MapLibre. They still load when the dispatch console mounts,
    // but they're parallel cacheable chunks instead of part of the
    // main bundle. Public-demo first-paint sees a sizeable improvement.
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ["maplibre-gl"],
          deckgl: [
            "@deck.gl/core",
            "@deck.gl/layers",
            "@deck.gl/mapbox",
            "@deck.gl/react",
          ],
          "react-vendor": ["react", "react-dom"],
          dexie: ["dexie", "dexie-react-hooks"],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
}));
