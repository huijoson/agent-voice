import { describe, it, expect } from "vitest";
import type { CommandRunner, RunResult, VoiceConfig } from "../types.js";
import { getSpeaker } from "./index.js";

const voice: VoiceConfig = { macos: null, windows: null, rate: 1, volume: 100 };

function makeFakeRunner(): { runner: CommandRunner; calls: Array<{ command: string; args: string[] }> } {
  const calls: Array<{ command: string; args: string[] }> = [];
  const runner: CommandRunner = async (command, args) => {
    calls.push({ command, args });
    const result: RunResult = { code: 0, stdout: "", stderr: "" };
    return result;
  };
  return { runner, calls };
}

describe("getSpeaker", () => {
  it("routes macos to the 'say' command", async () => {
    const { runner, calls } = makeFakeRunner();
    const speaker = getSpeaker("macos", runner);

    await speaker.speak("hello", voice);

    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("say");
  });

  it("routes windows to the 'powershell' command", async () => {
    const { runner, calls } = makeFakeRunner();
    const speaker = getSpeaker("windows", runner);

    await speaker.speak("hello", voice);

    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("powershell");
  });

  it("routes unsupported to a rejecting speaker that never calls the runner", async () => {
    const { runner, calls } = makeFakeRunner();
    const speaker = getSpeaker("unsupported", runner);

    await expect(speaker.speak("hello", voice)).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});
