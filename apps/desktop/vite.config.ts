import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("/react/") || id.includes("/react-dom/")) {
            return "vendor-react";
          }
          if (id.includes("@codemirror/lang-")) {
            return "vendor-codemirror-lang";
          }
          if (id.includes("@lezer")) {
            return "vendor-lezer";
          }
          if (id.includes("@codemirror") || id.includes("/codemirror/")) {
            return "vendor-codemirror-core";
          }
          if (id.includes("/radix-ui/") || id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("/lucide-react/")) {
            return "vendor-icons";
          }
          return undefined;
        },
      },
    },
  },
});
