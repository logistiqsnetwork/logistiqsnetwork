import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    // The site is reverse-proxied behind <label>.<PUBLIC_SITE_DOMAIN>; the proxy
    // masks the Host to localhost:3000, but accept any host so a dev server never
    // rejects a proxied request with "Blocked request".
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    viteReact(),
  ],
  // Exclude server-only modules (Node built-ins, Bun SQLite) from client bundle.
  // TanStack Start API routes use dynamic imports for these; any static import
  // that leaks into the client bundle would fail without this.
  ssr: {
    external: ["bun:sqlite", "node:path", "node:os", "node:fs"],
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Only externalize Node/bun built-ins during client build
        return ["bun:sqlite", "node:path", "node:os", "node:fs"].includes(id);
      },
    },
  },
});
