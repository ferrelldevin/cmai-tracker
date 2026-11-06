// Every story gets the app's fonts and design tokens (src/styles.css), plus two toolbar
// switches: Theme sets data-theme the way the app does, Text tries the large text size,
// Nav and Top try bottom and top bar styles.
import type { Preview } from "@storybook/react-vite";
import { useEffect } from "react";
import "@fontsource/atkinson-hyperlegible-next/latin-400.css";
import "@fontsource/atkinson-hyperlegible-next/latin-600.css";
import "@fontsource/atkinson-hyperlegible-next/latin-700.css";
import "../src/styles.css";
import "../src/mockup/mockup.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Light or dark theme",
      toolbar: { title: "Theme", icon: "mirror", items: ["light", "dark"], dynamicTitle: true },
    },
    textSize: {
      description: "Text size, as in Settings",
      toolbar: { title: "Text", icon: "paragraph", items: ["standard", "large"], dynamicTitle: true },
    },
    nav: {
      description: "Bottom bar style: current, soft (no hard line, tinted) or floating (a rounded dock)",
      toolbar: { title: "Nav", icon: "component", items: ["current", "soft", "floating"], dynamicTitle: true },
    },
    top: {
      description:
        "Top bar style: compact (chosen 2026-11-05: code over room, resident color badge, Switch button), compact-plain (no badge), current, or pill (resident chip)",
      toolbar: {
        title: "Top",
        icon: "sidebaralt",
        items: ["compact", "compact-plain", "current", "pill"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", textSize: "standard", nav: "floating", top: "compact" },
  decorators: [
    (Story, ctx) => {
      const theme = ctx.globals.theme as string;
      const textSize = ctx.globals.textSize as string;
      const nav = ctx.globals.nav as string;
      const top = ctx.globals.top as string;
      useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.mkText = textSize;
        document.documentElement.dataset.mkNav = nav;
        document.documentElement.dataset.mkTop = top;
      }, [theme, textSize, nav, top]);
      return <Story />;
    },
  ],
  parameters: {
    layout: "centered",
    controls: { expanded: true },
  },
};

export default preview;
