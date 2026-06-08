import { describe, it, expect } from "vitest";
import type { CommandRunner } from "../types.js";
import {
  buildPlayerScript,
  buildPowerShellArgs,
  createWindowsPlayer,
} from "./windows.js";

function recorder() {
  const calls: { cmd: string; args: string[] }[] = [];
  const runner: CommandRunner = async (cmd, args) => {
    calls.push({ cmd, args });
    return { code: 0, stdout: "", stderr: "" };
  };
  return { calls, runner };
}

describe("buildPlayerScript", () => {
  it("uses MediaPlayer and references the file path", () => {
    const script = buildPlayerScript("C:\\tmp\\cue.m4a");
    expect(script).toContain("System.Windows.Media.MediaPlayer");
    expect(script).toContain("C:\\tmp\\cue.m4a");
  });

  it("doubles single quotes in the path so it stays literal", () => {
    const script = buildPlayerScript("C:\\it's\\cue.m4a");
    expect(script).toContain("it''s");
  });

  it("waits for the clip length in milliseconds (no fractional-second truncation)", () => {
    const script = buildPlayerScript("C:\\x.m4a");
    expect(script).toContain("TotalMilliseconds");
    expect(script).toMatch(/Start-Sleep -Milliseconds/);
    // Must NOT pass a fractional Double to -Seconds (Int32 in WinPS 5.1 truncates).
    expect(script).not.toMatch(/Start-Sleep -Seconds \$player/);
  });

  it("fails (throws) when the media duration cannot be determined", () => {
    const script = buildPlayerScript("C:\\x.m4a");
    expect(script).toContain("HasTimeSpan");
    expect(script).toContain("throw");
  });
});

describe("buildPowerShellArgs", () => {
  it("passes the script as the final -Command argument, in STA mode", () => {
    const args = buildPowerShellArgs("SCRIPT");
    expect(args).toContain("-Command");
    // MediaPlayer requires STA.
    expect(args).toContain("-STA");
    expect(args.at(-1)).toBe("SCRIPT");
  });
});

describe("createWindowsPlayer", () => {
  it("runs powershell with the MediaPlayer script", async () => {
    const { calls, runner } = recorder();
    await createWindowsPlayer(runner).play("C:\\tmp\\cue.m4a");
    expect(calls).toHaveLength(1);
    expect(calls[0].cmd).toBe("powershell");
    expect(calls[0].args.at(-1)).toContain("MediaPlayer");
  });
});
