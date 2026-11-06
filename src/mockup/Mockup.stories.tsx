// One story per screen of the five-step flow, plus Flow, which shows all five side by side.
// Change a story's Controls (bottom panel) to try layouts live; edit Screens.tsx or
// mockup.css and the page reloads on save. Made-up data only (mock-data.ts).

import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoginScreen, LogScreen, ReportScreen, ScoreScreen, SettingsScreen } from "./Screens";

const meta: Meta = { title: "Mockup/Five-step flow" };
export default meta;

export const Login: StoryObj<typeof LoginScreen> = {
  name: "1. Login",
  render: (args) => <LoginScreen {...args} />,
  args: { step: "sign-in", method: "phone-pin" },
  argTypes: {
    step: { control: "inline-radio", options: ["sign-in", "choose-resident"] },
    method: {
      control: "inline-radio",
      options: ["phone-pin", "lab-account"],
      description: "R1 is open: phone PIN or lab accounts",
    },
  },
};

export const Log: StoryObj<typeof LogScreen> = {
  name: "2. Behavior log",
  render: (args) => <LogScreen {...args} />,
  args: {
    layout: "grid",
    columns: 3,
    groupTabs: true,
    showFrequent: true,
    iconSize: 26,
    iconPlacement: "top",
    tileHeight: 76,
    tilePaddingY: 8,
    tilePaddingX: 12,
    tileGap: 8,
  },
  argTypes: {
    layout: { control: "inline-radio", options: ["grid", "list"] },
    columns: { control: "inline-radio", options: [1, 2, 3, 4], if: { arg: "layout", eq: "grid" } },
    iconSize: { control: { type: "range", min: 14, max: 48, step: 2 }, description: "Icon size in px" },
    iconPlacement: {
      control: "inline-radio",
      options: ["top", "beside-name", "centered"],
      if: { arg: "layout", eq: "grid" },
      description: "Where the icon sits in the tile",
    },
    tileHeight: {
      control: { type: "range", min: 44, max: 140, step: 2 },
      if: { arg: "layout", eq: "grid" },
      description: "Tile minimum height in px",
    },
    tilePaddingY: {
      control: { type: "range", min: 0, max: 32, step: 2 },
      if: { arg: "layout", eq: "grid" },
      description: "Space inside the tile, top and bottom (px)",
    },
    tilePaddingX: {
      control: { type: "range", min: 0, max: 32, step: 2 },
      if: { arg: "layout", eq: "grid" },
      description: "Space inside the tile, left and right (px)",
    },
    tileGap: {
      control: { type: "range", min: 0, max: 24, step: 2 },
      if: { arg: "layout", eq: "grid" },
      description: "Space between tiles (px)",
    },
    groupTabs: { control: "boolean", description: "One behavior group at a time, picked from tabs" },
    showFrequent: { control: "boolean", description: "This resident's most logged behaviors on top" },
  },
};

export const Score: StoryObj<typeof ScoreScreen> = {
  name: "3. Score",
  render: (args) => <ScoreScreen {...args} />,
  args: { order: "total-first", showUnlogged: false },
  argTypes: {
    order: {
      control: "inline-radio",
      options: ["behaviors-first", "total-first"],
      description:
        "Devin 2026-11-06: total on top in the mockup, still marked secondary. D-08 has a proposed change; the app stays behaviors first until the lab agrees.",
    },
    showUnlogged: { control: "boolean", description: "List the behaviors with no logs (each rated 1)" },
  },
};

export const Report: StoryObj<typeof ReportScreen> = {
  name: "4. Report",
  render: (args) => <ReportScreen key={args.view} {...args} />,
  args: { view: "two-week", todayLogs: "as logged", heatHours: 4 },
  argTypes: {
    view: { control: "inline-radio", options: ["daily", "two-week"] },
    heatHours: {
      control: "inline-radio",
      options: [2, 3, 4, 6],
      description: "Time of day chart: hours per block",
    },
    todayLogs: {
      control: "inline-radio",
      options: ["as logged", "busy day"],
      description: "Busy day: 32 logs, to check the Today list as it grows",
    },
  },
};

export const Settings: StoryObj = {
  name: "5. Settings",
  render: () => <SettingsScreen />,
};

export const Flow: StoryObj = {
  name: "All five screens",
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="mk-flow">
      <figure>
        <figcaption>1. Login</figcaption>
        <LoginScreen step="sign-in" method="phone-pin" />
      </figure>
      <figure>
        <figcaption>1b. Choose resident</figcaption>
        <LoginScreen step="choose-resident" method="phone-pin" />
      </figure>
      <figure>
        <figcaption>2. Behavior log</figcaption>
        <LogScreen layout="grid" columns={3} groupTabs showFrequent />
      </figure>
      <figure>
        <figcaption>3. Score</figcaption>
        <ScoreScreen order="total-first" showUnlogged={false} />
      </figure>
      <figure>
        <figcaption>4. Report, two weeks</figcaption>
        <ReportScreen view="two-week" />
      </figure>
      <figure>
        <figcaption>4b. Report, today</figcaption>
        <ReportScreen view="daily" />
      </figure>
      <figure>
        <figcaption>5. Settings</figcaption>
        <SettingsScreen />
      </figure>
    </div>
  ),
};
