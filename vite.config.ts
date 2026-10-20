import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];

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
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules")) {
              if (
                id.includes("jspdf") ||
                id.includes("html2canvas") ||
                id.includes("purify")
              )
                return "vendor-pdf";
              if (id.includes("html5-qrcode") || id.includes("qrcode"))
                return "vendor-qr";
              if (id.includes("framer-motion")) return "vendor-motion";
              if (id.includes("@supabase")) return "vendor-supabase";
              if (id.includes("react-router")) return "vendor-router";
              if (id.includes("react")) return "vendor-react";
            }
          },
        },
      },
    },
  };
});
