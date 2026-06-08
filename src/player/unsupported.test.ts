import { describe, it, expect } from "vitest";
import { createUnsupportedPlayer } from "./unsupported.js";

describe("createUnsupportedPlayer", () => {
  it("rejects with a clear message naming the platform", async () => {
    await expect(
      createUnsupportedPlayer("linux").play("/tmp/x.m4a"),
    ).rejects.toThrow(/linux/);
  });

  it("states the platform is not supported", async () => {
    await expect(
      createUnsupportedPlayer("freebsd").play("/tmp/x.m4a"),
    ).rejects.toThrow(/support/i);
  });
});
