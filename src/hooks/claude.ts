import fs from "node:fs/promises";
import path from "node:path";
import { getClaudeSettingsPath, getClaudeSettingsDir } from "../utils/paths.js";

/**
 * Assumed Claude Code hooks shape (see project task spec / Claude Code docs):
 *
 *   settings.json is a JSON object. Hooks live under the top-level `hooks` key,
 *   keyed by event name (e.g. "Stop", "Notification"). Each event maps to an
 *   ARRAY of matcher-groups. Each matcher-group is an object of the shape
 *   `{ matcher?: string; hooks: Array<{ type: "command"; command: string }> }`.
 *
 *   {
 *     "hooks": {
 *       "Stop": [ { "hooks": [ { "type": "command", "command": "..." } ] } ],
 *       "Notification": [ { "hooks": [ { "type": "command", "command": "..." } ] } ]
 *     }
 *   }
 *
 * The merge below is intentionally CONSERVATIVE / non-destructive: we never
 * remove or rewrite existing keys, events, matcher-groups or hook entries. We
 * only ensure the containers exist and append our own command entry when an
 * identical command is not already present (idempotent). The original file is
 * backed up byte-for-byte before any write.
 */

type CommandHook = { type: "command"; command: string };
type MatcherGroup = { matcher?: string; hooks?: CommandHook[] };

interface InstallOptions {
  homeDir?: string;
  now?: Date;
  log?: (message: string) => void;
}

interface InstallResult {
  settingsPath: string;
  backupPath: string | null;
  created: boolean;
  changed: boolean;
}

const TARGETS: Record<string, string> = {
  Stop: "agent-voice speak --event done",
  Notification: "agent-voice speak --event needInput",
};

/** Format a date as "YYYYMMDDHHmmss" in local time, zero-padded. */
export function formatBackupTimestamp(date: Date): string {
  const pad = (n: number, width = 2): string => String(n).padStart(width, "0");
  return (
    pad(date.getFullYear(), 4) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** True for a non-null, non-array object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Ensure an event in `hooks` contains a command-hook for `command`.
 * Returns true if an entry was appended, false if it already existed.
 */
function ensureEventHook(
  hooks: Record<string, unknown>,
  event: string,
  command: string,
): boolean {
  if (!Array.isArray(hooks[event])) {
    hooks[event] = [];
  }
  const groups = hooks[event] as MatcherGroup[];

  const alreadyPresent = groups.some(
    (group) =>
      Array.isArray(group?.hooks) &&
      group.hooks.some((entry) => entry?.command === command),
  );
  if (alreadyPresent) {
    return false;
  }

  groups.push({ hooks: [{ type: "command", command }] });
  return true;
}

/**
 * Install agent-voice hooks into the Claude Code settings.json, merging
 * non-destructively and idempotently. Backs up an existing file first.
 */
export async function installClaudeHook(
  options: InstallOptions = {},
): Promise<InstallResult> {
  const { homeDir, now = new Date(), log } = options;

  const settingsPath = getClaudeSettingsPath(homeDir);
  const settingsDir = getClaudeSettingsDir(homeDir);

  await fs.mkdir(settingsDir, { recursive: true });

  const exists = await fileExists(settingsPath);
  let originalText: string | null = null;
  let settings: Record<string, unknown>;
  let created: boolean;

  if (exists) {
    originalText = await fs.readFile(settingsPath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(originalText);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Existing Claude settings at ${settingsPath} is not valid JSON; ` +
          `fix or move it before installing (${detail}).`,
      );
    }
    // Never overwrite a settings file whose top level isn't a JSON object.
    if (!isPlainObject(parsed)) {
      throw new Error(
        `Existing Claude settings at ${settingsPath} is not a JSON object; ` +
          `refusing to overwrite it.`,
      );
    }
    settings = parsed;
    created = false;
  } else {
    settings = {};
    created = true;
  }

  // Ensure a hooks object WITHOUT clobbering a foreign shape.
  if (settings.hooks === undefined) {
    settings.hooks = {};
  } else if (!isPlainObject(settings.hooks)) {
    throw new Error(
      `Existing "hooks" in ${settingsPath} is not an object; refusing to ` +
        `overwrite it. Fix it manually before installing.`,
    );
  }
  const hooks = settings.hooks as Record<string, unknown>;

  let changed = false;
  const skipped: string[] = [];
  for (const [event, command] of Object.entries(TARGETS)) {
    const existing = hooks[event];
    if (existing !== undefined && !Array.isArray(existing)) {
      // A foreign (non-array) value for this event — preserve it untouched
      // rather than overwrite the user's configuration.
      skipped.push(event);
      continue;
    }
    if (ensureEventHook(hooks, event, command)) {
      changed = true;
    }
  }

  if (skipped.length > 0) {
    log?.(
      `Left existing non-array hooks untouched: ${skipped.join(", ")}. ` +
        `Add agent-voice to them manually if desired.`,
    );
  }

  // Back up and write only when there is an actual change, so re-runs and
  // no-op installs neither churn the user's file nor pile up backups.
  let backupPath: string | null = null;
  if (changed) {
    if (exists && originalText !== null) {
      backupPath = path.join(
        settingsDir,
        `settings.json.bak-${formatBackupTimestamp(now)}`,
      );
      await fs.writeFile(backupPath, originalText, "utf8");
      log?.(`Backed up existing settings to ${backupPath}`);
    }
    await fs.writeFile(
      settingsPath,
      JSON.stringify(settings, null, 2) + "\n",
      "utf8",
    );
    log?.(`Updated Claude hooks in ${settingsPath}`);
  } else {
    log?.(`Claude hooks already present in ${settingsPath}; no changes made.`);
  }

  return { settingsPath, backupPath, created, changed };
}
