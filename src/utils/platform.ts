/** The platforms agent-voice can target. */
export type Platform = "macos" | "windows" | "unsupported";

/**
 * Normalize a Node.js platform identifier into an agent-voice platform.
 * Defaults to the current process platform.
 */
export function getPlatform(platform: NodeJS.Platform = process.platform): Platform {
  switch (platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "unsupported";
  }
}
