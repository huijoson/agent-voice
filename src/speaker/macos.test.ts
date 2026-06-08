import { describe, it, expect, vi } from "vitest";
import type { CommandRunner, RunResult, VoiceConfig } from "../types.js";
import { buildSayArgs, createMacosSpeaker } from "./macos.js";

const voiceNoMac: VoiceConfig = { macos: null, windows: null, rate: 1, volume: 100 };
const voiceAlex: VoiceConfig = { macos: "Alex", windows: null, rate: 1, volume: 100 };

/** A fake runner that records its calls and never spawns anything. */
function makeFakeRunner(): { runner: CommandRunner; calls: Array<{ command: string; args: string[] }> } {
  const calls: Array<{ command: string; args: string[] }> = [];
  const runner: CommandRunner = async (command, args) => {
    calls.push({ command, args });
    const result: RunResult = { code: 0, stdout: "", stderr: "" };
    return result;
  };
  return { runner, calls };
}

describe("buildSayArgs", () => {
  it("returns just the text when no macOS voice is set", () => {
    expect(buildSayArgs("hello world", voiceNoMac)).toEqual(["hello world"]);
  });

  it("prepends -v <voice> when a macOS voice is set", () => {
    expect(buildSayArgs("hello world", voiceAlex)).toEqual(["-v", "Alex", "hello world"]);
  });
});

describe("createMacosSpeaker", () => {
  it("calls the runner with 'say' and the text as the last arg", async () => {
    const { runner, calls } = makeFakeRunner();
    const speaker = createMacosSpeaker(runner);

    await speaker.speak("hello", voiceNoMac);

    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("say");
    expect(calls[0].args[calls[0].args.length - 1]).toBe("hello");
  });

  it("resolves to void", async () => {
    const { runner } = makeFakeRunner();
    const speaker = createMacosSpeaker(runner);

    await expect(speaker.speak("hi", voiceNoMac)).resolves.toBeUndefined();
  });

  it("passes dangerous text verbatim as a single, unchanged last argument", async () => {
    const { runner, calls } = makeFakeRunner();
    const speaker = createMacosSpeaker(runner);
    const dangerous = "`$(rm -rf /)`";

    await speaker.speak(dangerous, voiceAlex);

    const args = calls[0].args;
    expect(args[args.length - 1]).toBe(dangerous);
    // The dangerous text must occupy exactly one argument slot.
    expect(args.filter((a) => a === dangerous)).toHaveLength(1);
  });

  it("propagates a runner rejection", async () => {
    const failing: CommandRunner = vi.fn(async () => {
      throw new Error("say failed");
    });
    const speaker = createMacosSpeaker(failing);

    await expect(speaker.speak("hi", voiceNoMac)).rejects.toThrow("say failed");
  });
});
