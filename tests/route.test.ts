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
