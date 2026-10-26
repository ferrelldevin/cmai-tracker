// Screens in the URL hash, so the back gesture and a reload keep your place.
import { describe, expect, it } from "vitest";
import { parseRoute, routeHash } from "../src/ui/route";

describe("routes", () => {
  it("reads each tab", () => {
    for (const tab of ["log", "scores", "review", "data"] as const) expect(parseRoute(`#/${tab}`)).toEqual({ tab, page: null });
  });

  it("reads a Data page, and only under Data", () => {
    expect(parseRoute("#/data/backup")).toEqual({ tab: "data", page: "backup" });
    expect(parseRoute("#/log/backup")).toEqual({ tab: "log", page: null });
  });

  it("drops what it does not know", () => {
    expect(parseRoute("")).toBeNull();
    expect(parseRoute("#group-physical")).toBeNull();
    expect(parseRoute("#/settings")).toBeNull();
    expect(parseRoute("#/data/nope")).toEqual({ tab: "data", page: null });
  });

  it("writes what it reads", () => {
    for (const h of ["#/log", "#/data", "#/data/display", "#/data/about"]) expect(routeHash(parseRoute(h)!)).toBe(h);
  });
});

describe("Scores periods in the URL", () => {
  it("reads a period and All periods", () => {
    expect(parseRoute("#/scores/p3")).toEqual({ tab: "scores", page: null, period: 3 });
    expect(parseRoute("#/scores/all")).toEqual({ tab: "scores", page: "all" });
  });

  it("drops a period it cannot read", () => {
    for (const h of ["#/scores/p0", "#/scores/3", "#/scores/px", "#/scores/backup"]) expect(parseRoute(h)).toEqual({ tab: "scores", page: null });
  });

  it("writes what it reads", () => {
    for (const h of ["#/scores", "#/scores/p2", "#/scores/all"]) expect(routeHash(parseRoute(h)!)).toBe(h);
    expect(routeHash({ tab: "log", page: null, period: 2 })).toBe("#/log");
  });
});
