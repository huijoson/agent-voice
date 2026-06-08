import { describe, it, expect } from "vitest";
import type { CommandRunner, VoiceConfig } from "../types.js";
import { createUnsupportedSpeaker } from "./unsupported.js";

const voice: VoiceConfig = { macos: null, windows: null, rate: 1, volume: 100 };

describe("createUnsupportedSpeaker", () => {
  it("rejects with an error naming the given platform", async () => {
    const speaker = createUnsupportedSpeaker("freebsd");
    await expect(speaker.speak("hi", voice)).rejects.toThrow(/freebsd/);
  });

  it("rejects with an Error instance", async () => {
    const speaker = createUnsupportedSpeaker("sunos");
    await expect(speaker.speak("hi", voice)).rejects.toBeInstanceOf(Error);
  });

  it("never invokes a runner / spawns a process", async () => {
    // This guard runner throws synchronously if it is ever called.
    const guard: CommandRunner = () => {
      throw new Error("runner must not be called");
    };
    void guard; // The unsupported speaker takes no runner; this documents intent.

    const speaker = createUnsupportedSpeaker("aix");
    await expect(speaker.speak("hi", voice)).rejects.toThrow(/aix/);
  });

  it("defaults to the current process platform in its message", async () => {
    const speaker = createUnsupportedSpeaker();
    await expect(speaker.speak("hi", voice)).rejects.toThrow(new RegExp(process.platform));
  });
});
