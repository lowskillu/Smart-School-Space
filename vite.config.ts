import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "moody-dodos-search.loca.lt",
      "bright-days-itch.loca.lt",
      ".loca.lt",
      ".lhr.life"
    ],
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
      "/static": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" ? componentTagger() : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
