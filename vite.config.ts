import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "node:fs";
import type { Plugin } from "vite";
import { localTubeShare } from "./server/sharePlugin";
import { localTubeSync } from "./server/syncPlugin";

function localFfmpegCore(): Plugin {
  const files = {
    "/assets/scripts/ffmpeg-core.js": path.resolve(__dirname, "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js"),
    "/assets/scripts/ffmpeg-core.wasm": path.resolve(__dirname, "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm"),
  };
  return {
    name: "local-ffmpeg-core",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const file = files[request.url as keyof typeof files];
        if (!file) return next();
        response.setHeader("Content-Type", file.endsWith(".wasm") ? "application/wasm" : "text/javascript");
        fs.createReadStream(file).pipe(response);
      });
    },
    generateBundle() {
      for (const [url, file] of Object.entries(files)) {
        this.emitFile({ type: "asset", fileName: url.slice(1), source: fs.readFileSync(file) });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    localFfmpegCore(),
    localTubeShare(),
    // server-only values (DATABASE_URL, ...) are read from .env here and never reach the browser bundle
    localTubeSync(loadEnv(mode, process.cwd(), "")),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
