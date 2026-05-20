/// <reference types="vitest/config" />
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const r = (...args: string[]) => resolve(__dirname, ...args);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  return {
    root: r("src"),
    publicDir: r("public"),
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      target: "es2023",
      minify: isDev ? false : "oxc",
      cssMinify: isDev ? false : "lightningcss",
      sourcemap: isDev,
      rolldownOptions: {
        input: {
          background: r("src", "background", "background.ts"),
          options: r("src", "options", "options.html"),
          popup: r("src", "popup", "popup.html"),
        },
        output: {
          dir: r("Shared (Extension)", "Resources"),
          entryFileNames: "js/[name].js",
          chunkFileNames: "js/[name].js",
          assetFileNames: "media/[name].[ext]",
        },
      },
    },
    plugins: [react(), nodePolyfills()],
    test: {
      root: r("."),
      environment: "jsdom",
      globals: true,
      setupFiles: [r("test", "setupTests.ts")],
      coverage: {
        reporter: ["text", "json", "json-summary", "html"],
        reportsDirectory: r("coverage"),
        include: ["public/**", "scripts/**", "src/**"],
      },
      chaiConfig: {
        truncateThreshold: 0,
      },
    },
  };
});
