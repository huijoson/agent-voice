import type { CommandRunner, Player } from "../types.js";
import type { Platform } from "../utils/platform.js";
import { getPlatform } from "../utils/platform.js";
import { defaultRunner } from "../utils/shell.js";
import { createMacosPlayer } from "./macos.js";
import { createWindowsPlayer } from "./windows.js";
import { createUnsupportedPlayer } from "./unsupported.js";

/**
 * Select the {@link Player} implementation for the given platform.
 *
 * Defaults to the detected platform and the real {@link defaultRunner}; both are
 * injectable so callers and tests can override them.
 */
export function getPlayer(
  platform: Platform = getPlatform(),
  runner: CommandRunner = defaultRunner,
): Player {
  switch (platform) {
    case "macos":
      return createMacosPlayer(runner);
    case "windows":
      return createWindowsPlayer(runner);
    case "unsupported":
      return createUnsupportedPlayer();
  }
}
