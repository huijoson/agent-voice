import { describe, it, expect } from "vitest";
import { getPlatform } from "./platform.js";

describe("getPlatform", () => {
  it("maps darwin to macos", () => {
    expect(getPlatform("darwin")).toBe("macos");
  });

  it("maps win32 to windows", () => {
    expect(getPlatform("win32")).toBe("windows");
  });

  it("maps any other platform to unsupported", () => {
    expect(getPlatform("linux")).toBe("unsupported");
    expect(getPlatform("freebsd")).toBe("unsupported");
    expect(getPlatform("aix")).toBe("unsupported");
  });

  it("defaults to the current process platform", () => {
    // Should not throw and should return one of the known kinds.
    expect(["macos", "windows", "unsupported"]).toContain(getPlatform());
  });
});
