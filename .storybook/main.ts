// Storybook: a workshop for the design mockup in src/mockup. It runs the screens with the
// app's own CSS tokens and Vite setup, and its Controls panel changes layout and data live.
// Start it with `npm run storybook`. Docs: https://storybook.js.org/docs
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/mockup/**/*.stories.tsx"],
  framework: { name: "@storybook/react-vite", options: {} },
  // Lab project: send nothing to Storybook's usage telemetry.
  core: { disableTelemetry: true },
  // The app's PWA plugin writes a service worker; the mockup has no use for it.
  viteFinal: async (cfg) => ({
    ...cfg,
    plugins: (cfg.plugins ?? [])
      .flat()
      .filter((p) => !(p && typeof p === "object" && "name" in p && String(p.name).startsWith("vite-plugin-pwa"))),
  }),
};

export default config;
