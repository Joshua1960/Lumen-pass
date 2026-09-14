import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-expect-error Optional build metadata hook is generated locally when present.
    const m = await import("./.vite-source-tags.js");
    plugins.push(m.sourceTags());
  } catch {
    /* Optional source-tag helper file is not required for normal builds. */
  }

  const env = loadEnv(mode, process.cwd(), ["VITE_", "NEXT_PUBLIC_"]);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    define: processEnvDefines,
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (id.includes("jspdf")) {
                return "vendor-pdf";
              }
              if (
                id.includes("html5-qrcode") ||
                id.includes("/qrcode/") ||
                id.includes("node_modules/qrcode")
              ) {
                return "vendor-qrcode";
              }
              if (id.includes("framer-motion")) {
                return "vendor-framer";
              }
              return "vendor";
            }
          },
        },
      },
    },
  };
});
