import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_CONFIG,
  getConfigPath,
  ensureConfigDir,
  loadConfig,
  saveConfig,
  initConfig,
} from "./config.js";
import type { Config } from "./types.js";

let homeDir: string;

beforeEach(async () => {
  homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "av-"));
});

afterEach(async () => {
  await fs.rm(homeDir, { recursive: true, force: true });
});

describe("DEFAULT_CONFIG", () => {
  it("has the expected shape and non-empty messages", () => {
    expect(typeof DEFAULT_CONFIG.engine).toBe("string");
    expect(DEFAULT_CONFIG.engine.length).toBeGreaterThan(0);

    expect(DEFAULT_CONFIG.voice).toHaveProperty("macos");
    expect(DEFAULT_CONFIG.voice).toHaveProperty("windows");
    expect(DEFAULT_CONFIG.voice.macos).toBeNull();
    expect(DEFAULT_CONFIG.voice.windows).toBeNull();
    expect(typeof DEFAULT_CONFIG.voice.rate).toBe("number");
    expect(typeof DEFAULT_CONFIG.voice.volume).toBe("number");

    expect(DEFAULT_CONFIG.messages).toHaveProperty("done");
    expect(DEFAULT_CONFIG.messages).toHaveProperty("needInput");
    expect(DEFAULT_CONFIG.messages).toHaveProperty("permission");
    expect(DEFAULT_CONFIG.messages).toHaveProperty("error");

    for (const key of ["done", "needInput", "permission", "error"] as const) {
      const value = DEFAULT_CONFIG.messages[key];
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }

    expect(DEFAULT_CONFIG.notification).toHaveProperty("enabled");
    expect(DEFAULT_CONFIG.notification.enabled).toBe(false);
  });

  it("matches the exact specified default values", () => {
    expect(DEFAULT_CONFIG).toEqual({
      engine: "system",
      voice: { macos: null, windows: null, rate: 1, volume: 100 },
      messages: {
        done: "任務完成了，請回來確認結果。",
        needInput: "目前需要你的回覆，請回來看一下。",
        permission: "需要你的授權，請回來確認。",
        error: "執行發生錯誤，請檢查終端機。",
      },
      notification: { enabled: false },
    });
  });
});

describe("getConfigPath", () => {
  it("resolves <home>/.agent-voice/config.json", () => {
    expect(getConfigPath(homeDir)).toBe(
      path.join(homeDir, ".agent-voice", "config.json"),
    );
  });
});

describe("ensureConfigDir", () => {
  it("creates the config directory", async () => {
    const dir = path.join(homeDir, ".agent-voice");
    await ensureConfigDir(homeDir);
    const stat = await fs.stat(dir);
    expect(stat.isDirectory()).toBe(true);
  });

  it("is idempotent when the directory already exists", async () => {
    await ensureConfigDir(homeDir);
    await expect(ensureConfigDir(homeDir)).resolves.toBeUndefined();
  });
});

describe("saveConfig / loadConfig", () => {
  it("round-trips an equal object", async () => {
    await saveConfig(DEFAULT_CONFIG, homeDir);
    const loaded = await loadConfig(homeDir);
    expect(loaded).toEqual(DEFAULT_CONFIG);
  });

  it("writes pretty JSON with 2-space indent and a trailing newline", async () => {
    await saveConfig(DEFAULT_CONFIG, homeDir);
    const raw = await fs.readFile(getConfigPath(homeDir), "utf8");
    expect(raw).toBe(JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).toContain('\n  "engine"');
  });

  it("round-trips a customized config", async () => {
    const custom: Config = {
      engine: "system",
      voice: { macos: "Alex", windows: "Zira", rate: 1.5, volume: 80 },
      messages: {
        done: "done!",
        needInput: "input!",
        permission: "perm!",
        error: "err!",
      },
      notification: { enabled: true },
    };
    await saveConfig(custom, homeDir);
    const loaded = await loadConfig(homeDir);
    expect(loaded).toEqual(custom);
  });
});

describe("loadConfig errors", () => {
  it("throws an Error mentioning `agent-voice init` when the file is missing", async () => {
    await expect(loadConfig(homeDir)).rejects.toThrow(/agent-voice init/);
  });

  it("throws a distinct Error mentioning parse/config on invalid JSON", async () => {
    await ensureConfigDir(homeDir);
    await fs.writeFile(getConfigPath(homeDir), "{not json}", "utf8");
    let caught: unknown;
    try {
      await loadConfig(homeDir);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    const message = (caught as Error).message;
    expect(message).toMatch(/pars|config/i);
    expect(message).toContain(getConfigPath(homeDir));
    expect(message).not.toMatch(/agent-voice init/);
  });
});

describe("initConfig", () => {
  it("fresh creates dir + file and returns created:true", async () => {
    const result = await initConfig({ homeDir });
    expect(result.path).toBe(getConfigPath(homeDir));
    expect(result.created).toBe(true);
    expect(result.existed).toBe(false);

    const loaded = await loadConfig(homeDir);
    expect(loaded).toEqual(DEFAULT_CONFIG);
  });

  it("does not overwrite an existing file without force", async () => {
    const custom: Config = {
      ...DEFAULT_CONFIG,
      engine: "custom-engine",
      messages: { ...DEFAULT_CONFIG.messages, done: "untouched" },
    };
    await saveConfig(custom, homeDir);
    const before = await fs.readFile(getConfigPath(homeDir), "utf8");

    const result = await initConfig({ homeDir });
    expect(result.created).toBe(false);
    expect(result.existed).toBe(true);
    expect(result.path).toBe(getConfigPath(homeDir));

    const after = await fs.readFile(getConfigPath(homeDir), "utf8");
    expect(after).toBe(before);
  });

  it("overwrites an existing file when force is true", async () => {
    const custom: Config = {
      ...DEFAULT_CONFIG,
      engine: "custom-engine",
    };
    await saveConfig(custom, homeDir);

    const result = await initConfig({ force: true, homeDir });
    expect(result.created).toBe(true);
    expect(result.existed).toBe(true);

    const loaded = await loadConfig(homeDir);
    expect(loaded).toEqual(DEFAULT_CONFIG);
  });
});
