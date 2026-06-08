import type { CommandRunner, Player } from "../types.js";
import { defaultRunner } from "../utils/shell.js";

/**
 * Build the argument vector for the macOS `afplay` command. The path is the only
 * argument and is passed verbatim — `afplay` is spawned without a shell, so no
 * escaping is required. `afplay` blocks until playback finishes.
 */
export function buildAfplayArgs(filePath: string): string[] {
  return [filePath];
}

/**
 * Create a {@link Player} backed by the macOS `afplay` command.
 *
 * The runner is injectable so tests can record invocations without producing
 * audio. A runner rejection propagates to the caller.
 */
export function createMacosPlayer(runner: CommandRunner = defaultRunner): Player {
  return {
    async play(filePath: string): Promise<void> {
      await runner("afplay", buildAfplayArgs(filePath));
    },
  };
}
