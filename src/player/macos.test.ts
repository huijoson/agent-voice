import { describe, it, expect } from "vitest";
import type { CommandRunner } from "../types.js";
import { buildAfplayArgs, createMacosPlayer } from "./macos.js";

function recorder() {
  const calls: { cmd: string; args: string[] }[] = [];
  const runner: CommandRunner = async (cmd, args) => {
    calls.push({ cmd, args });
    return { code: 0, stdout: "", stderr: "" };
  };
  return { calls, runner };
}

describe("buildAfplayArgs", () => {
  it("returns the file path as the only argument", () => {
    expect(buildAfplayArgs("/tmp/cue.m4a")).toEqual(["/tmp/cue.m4a"]);
  });
});

describe("createMacosPlayer", () => {
  it("plays via afplay with the path as a discrete spawn argument", async () => {
    const { calls, runner } = recorder();
    await createMacosPlayer(runner).play("/tmp/cue.m4a");
    expect(calls).toHaveLength(1);
    expect(calls[0].cmd).toBe("afplay");
    expect(calls[0].args.at(-1)).toBe("/tmp/cue.m4a");
  });

  it("propagates a runner rejection", async () => {
    const runner: CommandRunner = async () => {
      throw new Error("boom");
    };
    await expect(createMacosPlayer(runner).play("/tmp/x.m4a")).rejects.toThrow(
      /boom/,
    );
  });
});
