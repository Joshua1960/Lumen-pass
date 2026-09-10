import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-expect-error - plugin module is optional
    const m = await import("./.vite-source-tags.js");
    plugins.push(m.sourceTags());
  } catch {
    // source-tags plugin is optional, continue without it
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
      // Increase warning limit and provide manual chunking to avoid very large bundles
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (
                id.includes("react") ||
                id.includes("react-dom") ||
                id.includes("react-router-dom")
              ) {
                return "vendor-react";
              }
              if (id.includes("@supabase")) {
                return "vendor-supabase";
              }
              if (id.includes("framer-motion")) {
                return "vendor-framer";
              }
              if (id.includes("html5-qrcode") || id.includes("qrcode")) {
                return "vendor-qrcode";
              }
              return "vendor";
            }
          },
        },
      },
    },
  };
});
