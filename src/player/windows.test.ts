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
});

describe("buildPowerShellArgs", () => {
  it("passes the script as the final -Command argument", () => {
    const args = buildPowerShellArgs("SCRIPT");
    expect(args).toContain("-Command");
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
