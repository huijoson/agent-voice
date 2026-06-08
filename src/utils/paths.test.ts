import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  getHomeDir,
  getConfigDir,
  getConfigPath,
  getClaudeSettingsDir,
  getClaudeSettingsPath,
} from "./paths.js";

const home = path.join(path.sep === "\\" ? "C:\\" : "/", "fake", "home");

describe("paths", () => {
  it("getHomeDir falls back to the OS home directory", () => {
    expect(getHomeDir()).toBe(os.homedir());
  });

  it("getHomeDir honours an explicit override", () => {
    expect(getHomeDir(home)).toBe(home);
  });

  it("getConfigDir resolves <home>/.agent-voice", () => {
    expect(getConfigDir(home)).toBe(path.join(home, ".agent-voice"));
  });

  it("getConfigPath resolves <home>/.agent-voice/config.json", () => {
    expect(getConfigPath(home)).toBe(
      path.join(home, ".agent-voice", "config.json"),
    );
  });

  it("getClaudeSettingsDir resolves <home>/.claude", () => {
    expect(getClaudeSettingsDir(home)).toBe(path.join(home, ".claude"));
  });

  it("getClaudeSettingsPath resolves <home>/.claude/settings.json", () => {
    expect(getClaudeSettingsPath(home)).toBe(
      path.join(home, ".claude", "settings.json"),
    );
  });
});
