// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Determine which widget to build from environment variable
const WIDGET_ENTRY = process.env.WIDGET_ENTRY || "company-widget";
const widgetConfigs: Record<string, { entry: string; name: string }> = {
  "company-widget": {
    entry: "src/company-widget.tsx",
    name: "company-widget",
  },
  "discover-widget": {
    entry: "src/discover-widget.tsx",
    name: "discover-widget",
  },
};

const config = widgetConfigs[WIDGET_ENTRY] || widgetConfigs["company-widget"];

export default defineConfig({
  plugins: [tailwindcss(), react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    // Don't clean output directory between builds so both widgets can coexist
    emptyOutDir: false,
    // Ensure a single CSS file per widget build
    cssCodeSplit: false,
    lib: {
      entry: config.entry,
      name: config.name,
      formats: ["es"],
      fileName: () => `${config.name}.js`,
    },
    outDir: "dist/assets",
    rollupOptions: {
      output: {
        // Inline all dynamic imports to prevent shared chunks (safe now since we build one widget at a time)
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            // Give each widget its own CSS name to prevent overwrites
            return `${config.name}.css`;
          }
          return "[name].[hash][extname]";
        },
      },
    },
  },
});