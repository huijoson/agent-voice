import { describe, it, expect, vi } from "vitest";
import type { CommandRunner, RunResult, VoiceConfig } from "../types.js";
import {
  mapRateToSapi,
  clampVolume,
  buildPowerShellScript,
  buildPowerShellArgs,
  createWindowsSpeaker,
} from "./windows.js";

const defaultVoice: VoiceConfig = { macos: null, windows: null, rate: 1, volume: 100 };

function makeFakeRunner(): { runner: CommandRunner; calls: Array<{ command: string; args: string[] }> } {
  const calls: Array<{ command: string; args: string[] }> = [];
  const runner: CommandRunner = async (command, args) => {
    calls.push({ command, args });
    const result: RunResult = { code: 0, stdout: "", stderr: "" };
    return result;
  };
  return { runner, calls };
}

describe("mapRateToSapi", () => {
  it("maps a 1x multiplier to 0", () => {
    expect(mapRateToSapi(1)).toBe(0);
  });

  it("maps a 2x multiplier to +10", () => {
    expect(mapRateToSapi(2)).toBe(10);
  });

  it("maps a 0.5x multiplier to -5", () => {
    expect(mapRateToSapi(0.5)).toBe(-5);
  });

  it("clamps above +10", () => {
    expect(mapRateToSapi(5)).toBe(10);
  });

  it("clamps below -10", () => {
    expect(mapRateToSapi(-5)).toBe(-10);
  });

  it("rounds to the nearest integer", () => {
    expect(mapRateToSapi(1.23)).toBe(2);
  });
});

describe("clampVolume", () => {
  it("clamps above 100", () => {
    expect(clampVolume(150)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(clampVolume(-5)).toBe(0);
  });

  it("returns an integer for in-range values", () => {
    expect(clampVolume(42.6)).toBe(43);
  });
});

describe("buildPowerShellScript", () => {
  it("uses the System.Speech synthesizer and speaks", () => {
    const script = buildPowerShellScript("hi", defaultVoice);
    expect(script).toContain("System.Speech.Synthesis.SpeechSynthesizer");
    expect(script).toContain(".Speak(");
  });

  it("sets the volume", () => {
    const script = buildPowerShellScript("hi", defaultVoice);
    expect(script).toContain("$speak.Volume = 100");
  });

  it("sets the rate", () => {
    const script = buildPowerShellScript("hi", defaultVoice);
    expect(script).toContain("$speak.Rate = 0");
  });

  it("does not select a voice when none is configured", () => {
    const script = buildPowerShellScript("hi", defaultVoice);
    expect(script).not.toContain("SelectVoice");
  });

  it("selects the configured voice with escaped quotes", () => {
    const voice: VoiceConfig = { macos: null, windows: "David O'Brien", rate: 1, volume: 100 };
    const script = buildPowerShellScript("hi", voice);
    expect(script).toContain("$speak.SelectVoice('David O''Brien')");
  });

  it("escapes single quotes in the spoken text", () => {
    const script = buildPowerShellScript("it's", defaultVoice);
    expect(script).toContain("it''s");
  });

  it("neutralizes an injection payload by doubling its quotes", () => {
    const payload = "'; Remove-Item C:\\ -Recurse; '";
    const script = buildPowerShellScript(payload, defaultVoice);
    expect(script).toContain("''; Remove-Item C:\\ -Recurse; ''");
  });
});

describe("buildPowerShellArgs", () => {
  it("wraps the script with the expected powershell flags", () => {
    const args = buildPowerShellArgs("MY-SCRIPT");
    expect(args).toEqual(["-NoProfile", "-NonInteractive", "-Command", "MY-SCRIPT"]);
  });
});

describe("createWindowsSpeaker", () => {
  it("calls the runner with 'powershell' and the script as the last arg", async () => {
    const { runner, calls } = makeFakeRunner();
    const speaker = createWindowsSpeaker(runner);

    await speaker.speak("hello", defaultVoice);

    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("powershell");
    const args = calls[0].args;
    expect(args[args.length - 1]).toBe(buildPowerShellScript("hello", defaultVoice));
  });

  it("resolves to void", async () => {
    const { runner } = makeFakeRunner();
    const speaker = createWindowsSpeaker(runner);

    await expect(speaker.speak("hi", defaultVoice)).resolves.toBeUndefined();
  });

  it("propagates a runner rejection", async () => {
    const failing: CommandRunner = vi.fn(async () => {
      throw new Error("powershell failed");
    });
    const speaker = createWindowsSpeaker(failing);

    await expect(speaker.speak("hi", defaultVoice)).rejects.toThrow("powershell failed");
  });
});
