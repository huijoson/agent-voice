/**
 * Command handlers and commander wiring for agent-voice.
 *
 * Each `run*` handler is a pure-ish function that takes its parsed options plus
 * an injected {@link CliDeps} bundle (IO, config/speaker/hook functions, target
 * home dir). This keeps the handlers fully testable without touching the real
 * filesystem, spawning audio, or reading stdin. {@link buildProgram} wires the
 * handlers to commander; `index.ts` supplies the real dependencies.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { DEFAULT_CONFIG, initConfig, loadConfig } from "./config.js";
import { getSpeaker } from "./speaker/index.js";
import { getPlayer } from "./player/index.js";
import { installClaudeHook } from "./hooks/claude.js";
import { installCodexHook } from "./hooks/codex.js";
import type { Config, EventName, VoiceConfig } from "./types.js";

/** Console-like output plus an interactive yes/no confirm. */
export interface CliIO {
  log: (message: string) => void;
  error: (message: string) => void;
  confirm: (question: string) => Promise<boolean>;
}

/** Injected dependencies for the command handlers. */
export interface CliDeps {
  io: CliIO;
  /** Home dir override; undefined means the real OS home directory. */
  homeDir?: string;
  initConfig: typeof initConfig;
  loadConfig: typeof loadConfig;
  getSpeaker: typeof getSpeaker;
  getPlayer: typeof getPlayer;
  installClaudeHook: typeof installClaudeHook;
  installCodexHook: typeof installCodexHook;
  /** Voice settings used by `say` when no config file exists. */
  defaultVoice: VoiceConfig;
}

const VALID_EVENTS: EventName[] = ["done", "needInput", "permission", "error"];

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Whether a file exists at `filePath`. */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** `agent-voice init` — create the config file (prompting before overwrite). */
export async function runInit(
  opts: { force?: boolean },
  deps: CliDeps,
): Promise<number> {
  const { io, homeDir } = deps;
  try {
    const result = await deps.initConfig({ force: opts.force, homeDir });

    if (result.created) {
      io.log(`Created config at ${result.path}`);
      return 0;
    }

    // The file already existed and force was not set — ask before overwriting.
    const overwrite = await io.confirm(
      `Config already exists at ${result.path}. Overwrite?`,
    );
    if (!overwrite) {
      io.log("Keeping existing config.");
      return 0;
    }

    const forced = await deps.initConfig({ force: true, homeDir });
    io.log(`Overwrote config at ${forced.path}`);
    return 0;
  } catch (err) {
    io.error(messageOf(err));
    return 1;
  }
}

/** `agent-voice speak --event <event>` — speak a configured message. */
export async function runSpeak(
  opts: { event: string },
  deps: CliDeps,
): Promise<number> {
  const { io, homeDir } = deps;

  // Validate the event first (it doesn't need a config), so an unknown event is
  // reported precisely even when no config exists yet.
  const event = opts.event as EventName;
  if (!VALID_EVENTS.includes(event)) {
    io.error(
      `Unknown event "${opts.event}". Valid events: ${VALID_EVENTS.join(", ")}.`,
    );
    return 1;
  }

  let config: Config;
  try {
    config = await deps.loadConfig(homeDir);
  } catch (err) {
    io.error(messageOf(err));
    return 1;
  }

  // Sound takes precedence over TTS: if this event has a sound file, play it.
  const configuredSound = config.sounds?.[event] ?? null;
  if (configuredSound) {
    // Resolve to an absolute path so playback behaves the same cross-platform
    // (the Windows player requires an absolute URI) and a leading-dash name
    // can't be read as a flag.
    const soundPath = path.resolve(configuredSound);
    if (!(await pathExists(soundPath))) {
      io.error(`Sound file for "${event}" not found: ${soundPath}`);
      return 1;
    }
    try {
      await deps.getPlayer().play(soundPath);
      return 0;
    } catch (err) {
      io.error(messageOf(err));
      return 1;
    }
  }

  // Defense in depth: loadConfig validates structure, but guard the lookup so a
  // missing message can never reach the speaker as `undefined`.
  const text = config.messages[event];
  if (typeof text !== "string") {
    io.error(
      `Config has no message for event "${event}". Re-run \`agent-voice init\` or add messages.${event}.`,
    );
    return 1;
  }

  try {
    await deps.getSpeaker().speak(text, config.voice);
    return 0;
  } catch (err) {
    io.error(messageOf(err));
    return 1;
  }
}

/** `agent-voice say "<text>"` — speak arbitrary text, independent of messages. */
export async function runSay(
  text: string | undefined,
  deps: CliDeps,
): Promise<number> {
  const { io, homeDir } = deps;

  if (!text || text.trim() === "") {
    io.error('No text provided. Usage: agent-voice say "<text>".');
    return 1;
  }

  // Use configured voice settings if a config exists; otherwise fall back to
  // the defaults. `say` never requires a config to be present.
  let voice = deps.defaultVoice;
  try {
    voice = (await deps.loadConfig(homeDir)).voice;
  } catch {
    // No (or unreadable) config — defaults are fine for ad-hoc speech.
  }

  try {
    await deps.getSpeaker().speak(text, voice);
    return 0;
  } catch (err) {
    io.error(messageOf(err));
    return 1;
  }
}

/** `agent-voice play "<file>"` — play an arbitrary audio file directly. */
export async function runPlay(
  filePath: string | undefined,
  deps: CliDeps,
): Promise<number> {
  const { io } = deps;

  if (!filePath || filePath.trim() === "") {
    io.error('No file provided. Usage: agent-voice play "<file>".');
    return 1;
  }
  // Resolve to absolute for consistent cross-platform playback.
  const resolved = path.resolve(filePath);
  if (!(await pathExists(resolved))) {
    io.error(`Audio file not found: ${resolved}`);
    return 1;
  }

  try {
    await deps.getPlayer().play(resolved);
    return 0;
  } catch (err) {
    io.error(messageOf(err));
    return 1;
  }
}

/** `agent-voice install --target <claude|codex>` — install an agent hook. */
export async function runInstall(
  opts: { target: string },
  deps: CliDeps,
): Promise<number> {
  const { io, homeDir } = deps;

  switch (opts.target) {
    case "claude":
      try {
        await deps.installClaudeHook({ homeDir, log: io.log });
        return 0;
      } catch (err) {
        io.error(messageOf(err));
        return 1;
      }
    case "codex":
      try {
        const result = await deps.installCodexHook({ log: io.log });
        // Codex support is a preview stub: nothing is installed yet. Reporting
        // success (0) would let automation assume the hook is active, so signal
        // a distinct "not implemented" code (2) — separate from a hard failure
        // (1). Once Codex install lands and reports `implemented: true`, this
        // returns 0 like the Claude path.
        return result.implemented ? 0 : 2;
      } catch (err) {
        io.error(messageOf(err));
        return 1;
      }
    default:
      io.error(
        `Unknown target "${opts.target}". Valid targets: claude, codex.`,
      );
      return 1;
  }
}

/** Build the commander program, wiring each command to its handler. */
export function buildProgram(deps: CliDeps): Command {
  const program = new Command();

  program
    .name("agent-voice")
    .description(
      "Speak customizable prompts so AI coding agents can notify you by voice.",
    )
    .version("0.1.0");

  program
    .command("init")
    .description("Create the config file (~/.agent-voice/config.json)")
    .option("-f, --force", "overwrite an existing config without asking")
    .action(async (opts: { force?: boolean }) => {
      process.exitCode = await runInit(opts, deps);
    });

  program
    .command("speak")
    .description("Speak the configured message for an event")
    .requiredOption(
      "--event <event>",
      "event: done | needInput | permission | error",
    )
    .action(async (opts: { event: string }) => {
      process.exitCode = await runSpeak(opts, deps);
    });

  program
    .command("say")
    .description("Speak arbitrary text directly")
    .argument("[text...]", "text to speak")
    .action(async (parts: string[]) => {
      const text = parts.join(" ");
      process.exitCode = await runSay(text, deps);
    });

  program
    .command("play")
    .description("Play an audio file directly")
    .argument("[file]", "path to the audio file")
    .action(async (file: string | undefined) => {
      process.exitCode = await runPlay(file, deps);
    });

  program
    .command("install")
    .description("Install an agent hook")
    .requiredOption("--target <target>", "target: claude | codex")
    .action(async (opts: { target: string }) => {
      process.exitCode = await runInstall(opts, deps);
    });

  return program;
}
