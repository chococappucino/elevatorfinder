import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createApiHandler } from "./server/api.js";
import { appShell } from "./server/pwaBuild.js";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const api = createApiHandler({
    kakaoRestKey: env.KAKAO_REST_API_KEY,
    kricKey: env.KRIC_API_KEY,
    seoulKey: env.SEOUL_API_KEY,
  });

  return {
    server: { watch: { ignored: ["**/public/station-maps/**"] } },
    plugins: [
      react(),
      appShell(),
      {
        name: "local-route-api",
        configureServer(server) {
          server.middlewares.use("/api", api);
        },
        configurePreviewServer(server) {
          server.middlewares.use("/api", api);
        },
      },
    ],
  };
});
