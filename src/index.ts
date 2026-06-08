#!/usr/bin/env node
/**
 * agent-voice CLI entry point.
 *
 * Assembles the real dependencies (console IO, an interactive confirm prompt,
 * and the concrete config/speaker/hook implementations) and hands them to the
 * commander program built in cli.ts.
 */

import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { buildProgram, type CliDeps, type CliIO } from "./cli.js";
import { DEFAULT_CONFIG, initConfig, loadConfig } from "./config.js";
import { getSpeaker } from "./speaker/index.js";
import { getPlayer } from "./player/index.js";
import { installClaudeHook } from "./hooks/claude.js";
import { installCodexHook } from "./hooks/codex.js";

const io: CliIO = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
  confirm: async (question) => {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      const answer = await rl.question(`${question} [y/N] `);
      return /^y(es)?$/i.test(answer.trim());
    } finally {
      rl.close();
    }
  },
};

const deps: CliDeps = {
  io,
  initConfig,
  loadConfig,
  getSpeaker,
  getPlayer,
  installClaudeHook,
  installCodexHook,
  defaultVoice: DEFAULT_CONFIG.voice,
};

async function main(): Promise<void> {
  const program = buildProgram(deps);
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
