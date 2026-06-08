/**
 * Shared type definitions for agent-voice.
 *
 * These are type-only declarations (no runtime behaviour), consumed across the
 * config, speaker, hook, and CLI modules.
 */

/** Voice / speech settings. `rate` is a best-effort multiplier (1 = normal). */
export interface VoiceConfig {
  /** macOS `say` voice name, or null for the system default. */
  macos: string | null;
  /** Windows SAPI voice name, or null for the system default. */
  windows: string | null;
  /** Best-effort speech rate multiplier (1 = normal). */
  rate: number;
  /** Volume, 0-100 (used on Windows; macOS uses the system volume). */
  volume: number;
}

/** The user-customizable spoken messages, keyed by event. */
export interface Messages {
  done: string;
  needInput: string;
  permission: string;
  error: string;
}

/** Event names map 1:1 to message keys. */
export type EventName = keyof Messages;

/** Reserved for a future OS desktop-notification feature (disabled in v1). */
export interface NotificationConfig {
  enabled: boolean;
}

/** The full on-disk configuration (`~/.agent-voice/config.json`). */
export interface Config {
  /** TTS engine. v1 only supports "system". */
  engine: string;
  voice: VoiceConfig;
  messages: Messages;
  notification: NotificationConfig;
}

/** Result of running a child process. */
export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Injectable command runner. Runs `command` with an argument array — never a
 * concatenated shell string. Resolves with the result on a zero exit code and
 * rejects on a non-zero exit code or spawn failure. Injecting this lets tests
 * assert the exact command + args without producing audio.
 */
export type CommandRunner = (command: string, args: string[]) => Promise<RunResult>;

/** A platform-specific text-to-speech implementation. */
export interface Speaker {
  /** Speak `text` using the given voice settings. */
  speak(text: string, voice: VoiceConfig): Promise<void>;
}
