import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5178,
    strictPort: true,
    // release/ holds the packaged app (locked .exe); watching it breaks the dev server
    watch: { ignored: ["**/release/**", "**/dist/**"] },
  },
  build: { outDir: "dist", assetsDir: "assets", target: "chrome120" },
});
