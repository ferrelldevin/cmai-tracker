// Screens in the URL hash, so the back gesture and a reload keep your place.
import { describe, expect, it } from "vitest";
import { parseRoute, routeHash } from "../src/ui/route";

describe("routes", () => {
  it("reads each tab", () => {
    for (const tab of ["log", "scores", "data"] as const) expect(parseRoute(`#/${tab}`)).toEqual({ tab, page: null });
  });

  it("treats the removed #/review screen as unknown, so it lands on the start screen", () => {
    expect(parseRoute("#/review")).toBeNull();
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

describe("Scores period in the URL", () => {
  it("reads a period", () => {
    expect(parseRoute("#/scores/p3")).toEqual({ tab: "scores", page: null, period: 3 });
  });
  it("drops a period it cannot read", () => {
    for (const h of ["#/scores/p0", "#/scores/3", "#/scores/px", "#/scores/backup"]) expect(parseRoute(h)).toEqual({ tab: "scores", page: null });
  });
  it("writes what it reads", () => {
    for (const h of ["#/scores", "#/scores/p2"]) expect(routeHash(parseRoute(h)!)).toBe(h);
    expect(routeHash({ tab: "log", page: null, period: 2 })).toBe("#/log");
  });
});
