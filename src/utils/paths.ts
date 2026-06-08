import os from "node:os";
import path from "node:path";

/** The current user's home directory, or an explicit override (for tests). */
export function getHomeDir(homeDir?: string): string {
  return homeDir ?? os.homedir();
}

/** `<home>/.agent-voice` — the agent-voice config directory. */
export function getConfigDir(homeDir?: string): string {
  return path.join(getHomeDir(homeDir), ".agent-voice");
}

/** `<home>/.agent-voice/config.json` — the agent-voice config file. */
export function getConfigPath(homeDir?: string): string {
  return path.join(getConfigDir(homeDir), "config.json");
}

/** `<home>/.claude` — the Claude Code settings directory. */
export function getClaudeSettingsDir(homeDir?: string): string {
  return path.join(getHomeDir(homeDir), ".claude");
}

/** `<home>/.claude/settings.json` — the Claude Code settings file. */
export function getClaudeSettingsPath(homeDir?: string): string {
  return path.join(getClaudeSettingsDir(homeDir), "settings.json");
}
