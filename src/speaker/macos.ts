import type { CommandRunner, Speaker, VoiceConfig } from "../types.js";
import { defaultRunner } from "../utils/shell.js";

/**
 * Build the argument vector for the macOS `say` command.
 *
 * When a voice is configured we prepend `-v <voice>`; otherwise the system
 * default voice is used. The text is always the final argument and is passed
 * verbatim — `say` is spawned without a shell, so no escaping is required.
 *
 * TODO(v1): the macOS `say` rate flag (`-r <wpm>`) is intentionally not
 * implemented in v1. `VoiceConfig.rate` is a best-effort multiplier and mapping
 * it to words-per-minute is deferred to a later release.
 */
export function buildSayArgs(text: string, voice: VoiceConfig): string[] {
  return voice.macos ? ["-v", voice.macos, text] : [text];
}

/**
 * Create a {@link Speaker} backed by the macOS `say` command.
 *
 * The runner is injectable so tests can record invocations without producing
 * audio. A runner rejection propagates to the caller.
 */
export function createMacosSpeaker(runner: CommandRunner = defaultRunner): Speaker {
  return {
    async speak(text: string, voice: VoiceConfig): Promise<void> {
      await runner("say", buildSayArgs(text, voice));
    },
  };
}
