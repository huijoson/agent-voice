import type { CommandRunner, Speaker } from "../types.js";
import type { Platform } from "../utils/platform.js";
import { getPlatform } from "../utils/platform.js";
import { defaultRunner } from "../utils/shell.js";
import { createMacosSpeaker } from "./macos.js";
import { createWindowsSpeaker } from "./windows.js";
import { createUnsupportedSpeaker } from "./unsupported.js";

/**
 * Select the {@link Speaker} implementation for the given platform.
 *
 * Defaults to the detected platform and the real {@link defaultRunner}; both are
 * injectable so callers and tests can override them.
 */
export function getSpeaker(
  platform: Platform = getPlatform(),
  runner: CommandRunner = defaultRunner,
): Speaker {
  switch (platform) {
    case "macos":
      return createMacosSpeaker(runner);
    case "windows":
      return createWindowsSpeaker(runner);
    case "unsupported":
      return createUnsupportedSpeaker();
  }
}
