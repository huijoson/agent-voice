import { describe, expect, it, vi } from "vitest";
import { installCodexHook } from "./codex.js";

describe("installCodexHook", () => {
  it("resolves with a not-implemented message", async () => {
    const result = await installCodexHook();
    expect(result.implemented).toBe(false);
    expect(result.message).toContain(
      "Codex hook install is not fully implemented yet",
    );
  });

  it("calls the provided log spy with the message", async () => {
    const log = vi.fn();
    const result = await installCodexHook({ log });
    expect(log).toHaveBeenCalledWith(result.message);
  });
});
