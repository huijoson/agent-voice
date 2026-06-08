import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runInit,
  runSpeak,
  runSay,
  runInstall,
  runPlay,
  buildProgram,
  type CliDeps,
  type CliIO,
} from "./cli.js";
import { DEFAULT_CONFIG, loadConfig, saveConfig, initConfig } from "./config.js";
import { installClaudeHook } from "./hooks/claude.js";
import { installCodexHook } from "./hooks/codex.js";
import { getClaudeSettingsPath } from "./utils/paths.js";
import type { Config, Player, Speaker, VoiceConfig } from "./types.js";

let tmpHome: string;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "av-cli-"));
});

afterEach(async () => {
  await fs.rm(tmpHome, { recursive: true, force: true });
});

function makeHarness(homeDir: string, overrides: Partial<CliDeps> = {}) {
  const logs: string[] = [];
  const errors: string[] = [];
  let confirmResponse = true;
  const speakerCalls: { text: string; voice: VoiceConfig }[] = [];
  const speaker: Speaker = {
    speak: async (text, voice) => {
      speakerCalls.push({ text, voice });
    },
  };
  const playerCalls: string[] = [];
  const player: Player = {
    play: async (filePath) => {
      playerCalls.push(filePath);
    },
  };
  const io: CliIO = {
    log: (m) => logs.push(m),
    error: (m) => errors.push(m),
    confirm: async () => confirmResponse,
  };
  const deps: CliDeps = {
    io,
    homeDir,
    initConfig,
    loadConfig,
    getSpeaker: () => speaker,
    getPlayer: () => player,
    installClaudeHook,
    installCodexHook,
    defaultVoice: DEFAULT_CONFIG.voice,
    ...overrides,
  };
  return {
    deps,
    logs,
    errors,
    speakerCalls,
    playerCalls,
    setConfirm: (v: boolean) => {
      confirmResponse = v;
    },
  };
}

describe("runInit", () => {
  it("creates the config when none exists", async () => {
    const h = makeHarness(tmpHome);
    const code = await runInit({}, h.deps);
    expect(code).toBe(0);
    const config = await loadConfig(tmpHome);
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(h.logs.join("\n")).toMatch(/created/i);
  });

  it("overwrites an existing config when the user confirms", async () => {
    const custom: Config = {
      ...DEFAULT_CONFIG,
      messages: { ...DEFAULT_CONFIG.messages, done: "CUSTOM" },
    };
    await saveConfig(custom, tmpHome);

    const h = makeHarness(tmpHome);
    h.setConfirm(true);
    const code = await runInit({}, h.deps);

    expect(code).toBe(0);
    expect((await loadConfig(tmpHome)).messages.done).toBe(
      DEFAULT_CONFIG.messages.done,
    );
  });

  it("keeps an existing config when the user declines", async () => {
    const custom: Config = {
      ...DEFAULT_CONFIG,
      messages: { ...DEFAULT_CONFIG.messages, done: "CUSTOM" },
    };
    await saveConfig(custom, tmpHome);

    const h = makeHarness(tmpHome);
    h.setConfirm(false);
    const code = await runInit({}, h.deps);

    expect(code).toBe(0);
    expect((await loadConfig(tmpHome)).messages.done).toBe("CUSTOM");
    expect(h.logs.join("\n")).toMatch(/keep/i);
  });

  it("returns non-zero with a clean error when init fails", async () => {
    const h = makeHarness(tmpHome, {
      initConfig: async () => {
        throw new Error("disk full");
      },
    });

    const code = await runInit({}, h.deps);

    expect(code).not.toBe(0);
    expect(h.errors.join("\n")).toMatch(/disk full/);
  });
});

describe("runSpeak", () => {
  it("speaks the configured message for a known event", async () => {
    await saveConfig(DEFAULT_CONFIG, tmpHome);
    const h = makeHarness(tmpHome);

    const code = await runSpeak({ event: "done" }, h.deps);

    expect(code).toBe(0);
    expect(h.speakerCalls).toHaveLength(1);
    expect(h.speakerCalls[0].text).toBe(DEFAULT_CONFIG.messages.done);
  });

  it("exits non-zero on an unknown event", async () => {
    await saveConfig(DEFAULT_CONFIG, tmpHome);
    const h = makeHarness(tmpHome);

    const code = await runSpeak({ event: "nope" }, h.deps);

    expect(code).not.toBe(0);
    expect(h.errors.join("\n")).toMatch(/nope/);
    expect(h.speakerCalls).toHaveLength(0);
  });

  it("guides the user to init when no config exists", async () => {
    const h = makeHarness(tmpHome);

    const code = await runSpeak({ event: "done" }, h.deps);

    expect(code).not.toBe(0);
    expect(h.errors.join("\n")).toMatch(/agent-voice init/);
    expect(h.speakerCalls).toHaveLength(0);
  });

  it("exits non-zero with a clean message on a structurally-invalid config", async () => {
    // Hand-edited config with messages.done removed.
    const broken = {
      ...DEFAULT_CONFIG,
      messages: {
        needInput: "x",
        permission: "y",
        error: "z",
      },
    } as unknown as Config;
    await saveConfig(broken, tmpHome);

    const h = makeHarness(tmpHome);
    const code = await runSpeak({ event: "done" }, h.deps);

    expect(code).not.toBe(0);
    expect(h.errors.length).toBeGreaterThan(0);
    expect(h.speakerCalls).toHaveLength(0);
  });
});

describe("runSay", () => {
  it("speaks arbitrary text directly", async () => {
    await saveConfig(DEFAULT_CONFIG, tmpHome);
    const h = makeHarness(tmpHome);

    const code = await runSay("hello there", h.deps);

    expect(code).toBe(0);
    expect(h.speakerCalls[0].text).toBe("hello there");
  });

  it("works without a config, using default voice settings", async () => {
    const h = makeHarness(tmpHome);

    const code = await runSay("no config here", h.deps);

    expect(code).toBe(0);
    expect(h.speakerCalls[0].text).toBe("no config here");
    expect(h.speakerCalls[0].voice).toEqual(DEFAULT_CONFIG.voice);
  });

  it("exits non-zero on empty text", async () => {
    const h = makeHarness(tmpHome);

    const code = await runSay("   ", h.deps);

    expect(code).not.toBe(0);
    expect(h.errors.length).toBeGreaterThan(0);
    expect(h.speakerCalls).toHaveLength(0);
  });
});

describe("runSpeak with sounds", () => {
  it("plays the configured sound instead of speaking", async () => {
    const soundPath = path.join(tmpHome, "cue.m4a");
    await fs.writeFile(soundPath, "fake-audio");
    const cfg: Config = {
      ...DEFAULT_CONFIG,
      sounds: { ...DEFAULT_CONFIG.sounds!, done: soundPath },
    };
    await saveConfig(cfg, tmpHome);

    const h = makeHarness(tmpHome);
    const code = await runSpeak({ event: "done" }, h.deps);

    expect(code).toBe(0);
    expect(h.playerCalls).toEqual([soundPath]);
    expect(h.speakerCalls).toHaveLength(0);
  });

  it("falls back to TTS when no sound is configured", async () => {
    await saveConfig(DEFAULT_CONFIG, tmpHome); // sounds all null
    const h = makeHarness(tmpHome);

    const code = await runSpeak({ event: "done" }, h.deps);

    expect(code).toBe(0);
    expect(h.playerCalls).toHaveLength(0);
    expect(h.speakerCalls[0].text).toBe(DEFAULT_CONFIG.messages.done);
  });

  it("errors when the configured sound file is missing", async () => {
    const missing = path.join(tmpHome, "does-not-exist.m4a");
    const cfg: Config = {
      ...DEFAULT_CONFIG,
      sounds: { ...DEFAULT_CONFIG.sounds!, done: missing },
    };
    await saveConfig(cfg, tmpHome);

    const h = makeHarness(tmpHome);
    const code = await runSpeak({ event: "done" }, h.deps);

    expect(code).not.toBe(0);
    expect(h.errors.join("\n")).toContain(missing);
    expect(h.playerCalls).toHaveLength(0);
    expect(h.speakerCalls).toHaveLength(0);
  });
});

describe("runPlay", () => {
  it("plays an existing file via the player", async () => {
    const soundPath = path.join(tmpHome, "cue.m4a");
    await fs.writeFile(soundPath, "fake-audio");
    const h = makeHarness(tmpHome);

    const code = await runPlay(soundPath, h.deps);

    expect(code).toBe(0);
    expect(h.playerCalls).toEqual([soundPath]);
  });

  it("errors on an empty file argument", async () => {
    const h = makeHarness(tmpHome);
    const code = await runPlay("", h.deps);
    expect(code).not.toBe(0);
    expect(h.errors.length).toBeGreaterThan(0);
    expect(h.playerCalls).toHaveLength(0);
  });

  it("errors on a nonexistent file", async () => {
    const missing = path.join(tmpHome, "nope.m4a");
    const h = makeHarness(tmpHome);
    const code = await runPlay(missing, h.deps);
    expect(code).not.toBe(0);
    expect(h.errors.join("\n")).toContain(missing);
    expect(h.playerCalls).toHaveLength(0);
  });
});

describe("runInstall", () => {
  it("installs the Claude hook", async () => {
    const h = makeHarness(tmpHome);

    const code = await runInstall({ target: "claude" }, h.deps);

    expect(code).toBe(0);
    const settings = JSON.parse(
      await fs.readFile(getClaudeSettingsPath(tmpHome), "utf8"),
    );
    expect(JSON.stringify(settings)).toContain("agent-voice speak --event done");
  });

  it("runs the Codex stub, reports not-implemented, and exits with the preview code 2", async () => {
    const h = makeHarness(tmpHome);

    const code = await runInstall({ target: "codex" }, h.deps);

    // Nothing was installed, so this must NOT report success (0); a distinct
    // code (2) lets automation tell "not implemented yet" apart from a hard
    // failure (1, e.g. unknown target or a Claude install error).
    expect(code).toBe(2);
    expect(h.logs.join("\n")).toMatch(/not fully implemented yet/i);
  });

  it("exits non-zero on an unknown target", async () => {
    const h = makeHarness(tmpHome);

    const code = await runInstall({ target: "frobnicate" }, h.deps);

    expect(code).not.toBe(0);
    expect(h.errors.join("\n")).toMatch(/frobnicate/);
  });
});

describe("buildProgram (commander wiring)", () => {
  it("wires `say` to speak joined arguments", async () => {
    await saveConfig(DEFAULT_CONFIG, tmpHome);
    const h = makeHarness(tmpHome);
    const program = buildProgram(h.deps);

    await program.parseAsync(["node", "agent-voice", "say", "hello", "world"]);

    expect(h.speakerCalls[0].text).toBe("hello world");
  });

  it("wires `speak --event` end to end (init then speak)", async () => {
    const h = makeHarness(tmpHome);
    const program = buildProgram(h.deps);

    await program.parseAsync(["node", "agent-voice", "init"]);
    await program.parseAsync(["node", "agent-voice", "speak", "--event", "done"]);

    expect(h.speakerCalls.at(-1)?.text).toBe(DEFAULT_CONFIG.messages.done);
  });
});
