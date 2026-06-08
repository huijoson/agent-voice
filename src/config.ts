/**
 * Configuration loading, saving, and initialization for agent-voice.
 *
 * The on-disk config lives at `~/.agent-voice/config.json`. All functions
 * accept an optional `homeDir` override so tests never touch the real home.
 */

import fs from "node:fs/promises";
import type { Config } from "./types.js";
import {
  getConfigDir,
  getConfigPath as resolveConfigPath,
} from "./utils/paths.js";

/** The default configuration written on `agent-voice init`. */
export const DEFAULT_CONFIG: Config = {
  engine: "system",
  voice: { macos: null, windows: null, rate: 1, volume: 100 },
  messages: {
    done: "任務完成了，請回來確認結果。",
    needInput: "目前需要你的回覆，請回來看一下。",
    permission: "需要你的授權，請回來確認。",
    error: "執行發生錯誤，請檢查終端機。",
  },
  notification: { enabled: false },
};

/** `<home>/.agent-voice/config.json` — the agent-voice config file. */
export function getConfigPath(homeDir?: string): string {
  return resolveConfigPath(homeDir);
}

/** Create the config directory (recursively) if it does not yet exist. */
export async function ensureConfigDir(homeDir?: string): Promise<void> {
  await fs.mkdir(getConfigDir(homeDir), { recursive: true });
}

/**
 * Read and parse the config file.
 *
 * Throws a friendly Error pointing the user at `agent-voice init` when the
 * file is missing, and a distinct Error mentioning the unparseable config
 * (including its path) when the JSON is malformed.
 */
export async function loadConfig(homeDir?: string): Promise<Config> {
  const configPath = getConfigPath(homeDir);

  let raw: string;
  try {
    raw = await fs.readFile(configPath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `No config found at ${configPath}. Run \`agent-voice init\` to create one.`,
      );
    }
    throw err;
  }

  try {
    return JSON.parse(raw) as Config;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not parse the config file at ${configPath}: ${detail}`,
    );
  }
}

/** Write `config` as pretty JSON (2-space indent + trailing newline, utf8). */
export async function saveConfig(
  config: Config,
  homeDir?: string,
): Promise<void> {
  await ensureConfigDir(homeDir);
  const json = JSON.stringify(config, null, 2) + "\n";
  await fs.writeFile(getConfigPath(homeDir), json, "utf8");
}

/**
 * Initialize the config file.
 *
 * If the file already exists and `force` is not set, it is left untouched and
 * `{ created: false, existed: true }` is returned. Otherwise the default config
 * is written and `created: true` is returned (with `existed` reflecting whether
 * a file was present beforehand).
 */
export async function initConfig(opts?: {
  force?: boolean;
  homeDir?: string;
}): Promise<{ path: string; created: boolean; existed: boolean }> {
  const { force = false, homeDir } = opts ?? {};
  const configPath = getConfigPath(homeDir);

  const existed = await fileExists(configPath);

  if (existed && !force) {
    return { path: configPath, created: false, existed: true };
  }

  await saveConfig(DEFAULT_CONFIG, homeDir);
  return { path: configPath, created: true, existed };
}

/** Whether a file exists at `filePath`. */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
