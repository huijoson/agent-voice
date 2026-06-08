import { describe, it, expect } from "vitest";
import type { CommandRunner } from "../types.js";
import { getPlayer } from "./index.js";

function recorder() {
  const calls: { cmd: string; args: string[] }[] = [];
  const runner: CommandRunner = async (cmd, args) => {
    calls.push({ cmd, args });
    return { code: 0, stdout: "", stderr: "" };
  };
  return { calls, runner };
}

describe("getPlayer", () => {
  it("routes macos to afplay", async () => {
    const { calls, runner } = recorder();
    await getPlayer("macos", runner).play("/tmp/x.m4a");
    expect(calls[0].cmd).toBe("afplay");
  });

  it("routes windows to powershell", async () => {
    const { calls, runner } = recorder();
    await getPlayer("windows", runner).play("C:\\x.m4a");
    expect(calls[0].cmd).toBe("powershell");
  });

  it("routes unsupported to a rejecting player that spawns nothing", async () => {
    const { calls, runner } = recorder();
    await expect(getPlayer("unsupported", runner).play("/x")).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});
