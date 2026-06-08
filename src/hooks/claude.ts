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

  let settings: Record<string, unknown>;
  let backupPath: string | null = null;
  let created: boolean;

  if (exists) {
    const originalText = await fs.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(originalText);
    settings =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};

    // Back up the ORIGINAL bytes before we ever write.
    backupPath = path.join(
      settingsDir,
      `settings.json.bak-${formatBackupTimestamp(now)}`,
    );
    await fs.writeFile(backupPath, originalText, "utf8");
    log?.(`Backed up existing settings to ${backupPath}`);
    created = false;
  } else {
    settings = {};
    created = true;
  }

  if (
    !settings.hooks ||
    typeof settings.hooks !== "object" ||
    Array.isArray(settings.hooks)
  ) {
    settings.hooks = {};
  }
  const hooks = settings.hooks as Record<string, unknown>;

  let changed = false;
  for (const [event, command] of Object.entries(TARGETS)) {
    if (ensureEventHook(hooks, event, command)) {
      changed = true;
    }
  }

  const output = JSON.stringify(settings, null, 2) + "\n";
  await fs.writeFile(settingsPath, output, "utf8");
  log?.(
    changed
      ? `Updated Claude hooks in ${settingsPath}`
      : `Claude hooks already present in ${settingsPath}`,
  );

  return { settingsPath, backupPath, created, changed };
}
