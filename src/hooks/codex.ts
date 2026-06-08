interface InstallCodexOptions {
  log?: (message: string) => void;
}

interface InstallCodexResult {
  implemented: false;
  message: string;
}

/**
 * Install agent-voice hooks into the Codex CLI configuration.
 *
 * TODO: This is a placeholder. The intended future behaviour is to:
 *   1. Locate the Codex config file (e.g. ~/.codex/config.* or the platform
 *      equivalent), creating its parent directory if necessary.
 *   2. Parse the existing config (TOML/JSON/whatever Codex uses).
 *   3. Merge equivalent notification hooks non-destructively and idempotently,
 *      mapping the same events agent-voice supports (done / needInput /
 *      permission / error) to Codex's hook/notify mechanism.
 *   4. Back up the original config before writing, mirroring installClaudeHook.
 *
 * Until then, we resolve cleanly with an explanatory message rather than
 * throwing, so callers can surface a friendly notice.
 */
export async function installCodexHook(
  options: InstallCodexOptions = {},
): Promise<InstallCodexResult> {
  const message =
    "Codex hook install is not fully implemented yet. " +
    "Please configure your Codex notification hook manually for now.";
  options.log?.(message);
  return { implemented: false, message };
}
