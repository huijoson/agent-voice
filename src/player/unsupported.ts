import type { Player } from "../types.js";

/**
 * Create a {@link Player} for an unsupported platform. It never spawns anything;
 * calling `play` rejects with a clear, platform-named error. (It takes no runner
 * by design — there is nothing safe to run.)
 */
export function createUnsupportedPlayer(
  platform: string = process.platform,
): Player {
  return {
    async play(): Promise<void> {
      throw new Error(
        `agent-voice cannot play audio on this platform: ${platform}. ` +
          `Sound playback is supported on macOS and Windows.`,
      );
    },
  };
}
