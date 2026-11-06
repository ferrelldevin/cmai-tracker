/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";

// Content-Security-Policy for the built app. GitHub Pages can't send security headers, so it goes in
// a meta tag. Scripts run only from the app's own files plus the one inline theme script in
// index.html, allowed by its hash; the hash is worked out here on every build, so editing that
// script can't silently break it. Build only: the dev server injects inline scripts of its own.
function contentSecurityPolicy(): Plugin {
  return {
    name: "cmai-csp",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          ([, body]) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`,
        );
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(" ")}`,
          "style-src 'self'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "worker-src 'self'",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'none'",
        ].join("; ");
        return html.replace(
          /(<meta charset="UTF-8" \/>)/,
          `$1\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        );
      },
    },
  };
}

// The commit a build came from, shown on the "How ratings are worked out" page and saved in every
// backup, so a result can be traced to the exact code that produced it. CI sets GITHUB_SHA.
function buildCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

// base: "./" lets the build run from any folder, including GitHub Pages.
export default defineConfig({
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD_COMMIT__: JSON.stringify(buildCommit()) },
  plugins: [
    react(),
    contentSecurityPolicy(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      // Fonts are bundled, so they must be cached too for the app to look right offline.
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,woff2}"] },
      manifest: {
        name: "CMAI Tracker",
        short_name: "CMAI",
        description: "Log agitated behaviors and see 14-day CMAI scores.",
        theme_color: "#0b6b66",
        background_color: "#f6f5f1",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 800 },
  test: {
    include: ["tests/**/*.test.ts"],
    // `npm run test:coverage` (run in CI) fails if coverage of the logic the scores depend on drops.
    // Floors are the 2026-11-03 levels: raise them as tests are added, never lower them to pass.
    coverage: {
      provider: "v8",
      include: ["src/scoring/**", "src/data/**"],
      reporter: ["text", "json-summary"],
      thresholds: {
        lines: 97,
        branches: 96,
        functions: 95,
        "src/scoring/engine.ts": { lines: 100, functions: 100, branches: 98 },
      },
    },
  },
});
