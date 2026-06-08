import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatBackupTimestamp, installClaudeHook } from "./claude.js";
import { getClaudeSettingsPath } from "../utils/paths.js";

let homeDir: string;

beforeEach(async () => {
  homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-voice-claude-"));
});

afterEach(async () => {
  await fs.rm(homeDir, { recursive: true, force: true });
});

const DONE = "agent-voice speak --event done";
const NEED_INPUT = "agent-voice speak --event needInput";

describe("formatBackupTimestamp", () => {
  it("formats a local date as YYYYMMDDHHmmss with zero padding", () => {
    expect(formatBackupTimestamp(new Date(2026, 5, 8, 9, 7, 5))).toBe(
      "20260608090705",
    );
  });
});

describe("installClaudeHook", () => {
  it("creates settings.json when absent with both hooks", async () => {
    const result = await installClaudeHook({ homeDir });

    expect(result.settingsPath).toBe(getClaudeSettingsPath(homeDir));
    expect(result.created).toBe(true);
    expect(result.backupPath).toBeNull();
    expect(result.changed).toBe(true);

    const raw = await fs.readFile(result.settingsPath, "utf8");
    const parsed = JSON.parse(raw);

    const stopCommands = parsed.hooks.Stop.flatMap((g: any) =>
      g.hooks.map((h: any) => h.command),
    );
    const notifCommands = parsed.hooks.Notification.flatMap((g: any) =>
      g.hooks.map((h: any) => h.command),
    );
    expect(stopCommands).toContain(DONE);
    expect(notifCommands).toContain(NEED_INPUT);
  });

  it("preserves existing keys and entries, and backs up the original", async () => {
    const settingsPath = getClaudeSettingsPath(homeDir);
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    const original = {
      model: "x",
      hooks: {
        Stop: [
          {
            hooks: [{ type: "command", command: "echo existing" }],
          },
        ],
      },
    };
    const originalText = JSON.stringify(original, null, 2);
    await fs.writeFile(settingsPath, originalText, "utf8");

    const result = await installClaudeHook({ homeDir });

    expect(result.created).toBe(false);
    expect(result.changed).toBe(true);
    expect(result.backupPath).toMatch(/settings\.json\.bak-\d{14}/);

    const parsed = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    expect(parsed.model).toBe("x");

    const stopCommands = parsed.hooks.Stop.flatMap((g: any) =>
      g.hooks.map((h: any) => h.command),
    );
    expect(stopCommands).toContain("echo existing");
    expect(stopCommands).toContain(DONE);

    const backupContents = await fs.readFile(result.backupPath!, "utf8");
    expect(backupContents).toBe(originalText);
  });

  it("is idempotent across repeated installs", async () => {
    await installClaudeHook({ homeDir });
    await installClaudeHook({ homeDir });

    const raw = await fs.readFile(getClaudeSettingsPath(homeDir), "utf8");
    const doneCount = raw.split(DONE).length - 1;
    const needInputCount = raw.split(NEED_INPUT).length - 1;
    expect(doneCount).toBe(1);
    expect(needInputCount).toBe(1);
  });

  it("reports changed:false when nothing new is added", async () => {
    await installClaudeHook({ homeDir });
    const second = await installClaudeHook({ homeDir });
    expect(second.changed).toBe(false);
  });
});
