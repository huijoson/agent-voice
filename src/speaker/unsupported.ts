import type { Speaker, VoiceConfig } from "../types.js";

/**
 * Create a {@link Speaker} for platforms agent-voice cannot speak on.
 *
 * `speak` always returns a rejected promise with a clear error naming the
 * offending platform. It never invokes a command runner or spawns a process.
 *
 * @param platform Platform identifier for the error message; defaults to the
 *   current `process.platform`.
 */
export function createUnsupportedSpeaker(platform: string = process.platform): Speaker {
  return {
    speak(_text: string, _voice: VoiceConfig): Promise<void> {
      return Promise.reject(
        new Error(
          `Text-to-speech is not supported on platform "${platform}". Only macOS and Windows are supported.`,
        ),
      );
    },
  };
}
