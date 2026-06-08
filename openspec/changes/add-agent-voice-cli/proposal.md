## Why

AI coding agents (Claude Code, Codex CLI, and others) run long, mostly-unattended
tasks. Developers context-switch away and then miss the exact moments that need
them: a task finished, the agent needs input, the agent needs authorization, or
something errored. Terminal-only, visual notifications are easy to miss when the
window is in the background.

A short spoken cue pulls attention back without staring at the terminal.
`agent-voice` is a tiny, dependency-light CLI that any agent's hook system can
invoke to speak a user-customizable message for these events. v1 is intentionally
narrow: cross-platform (macOS + Windows) using only the operating system's
built-in text-to-speech — no cloud services, no API keys, no GUI.

## What Changes

- New CLI binary `agent-voice` (TypeScript + Node.js, ESM).
- Four commands:
  - `agent-voice init` — create the JSON config file.
  - `agent-voice speak --event <done|needInput|permission|error>` — speak the
    configured message for an event.
  - `agent-voice say "<text>"` — speak arbitrary text directly.
  - `agent-voice install --target <claude|codex>` — install an agent hook.
- JSON configuration at `~/.agent-voice/config.json`
  (`%USERPROFILE%\.agent-voice\config.json` on Windows).
- System TTS only:
  - macOS uses the built-in `say` command via `spawn`.
  - Windows uses `System.Speech.Synthesis.SpeechSynthesizer` driven through
    PowerShell, with rate and volume support.
  - Any other platform uses an `unsupported` speaker that fails with a clear
    message.
- Safety: text is never concatenated into a shell command. macOS passes text as a
  spawn argument; Windows uses a dedicated, tested PowerShell single-quote
  escaping helper. This prevents shell/script injection from user-customized
  message text.
- Claude Code hook installer: non-destructively merges `Stop` → speak `done` and
  `Notification` → speak `needInput` into `~/.claude/settings.json`, taking a
  timestamped backup first and never deleting existing hooks. Re-running is
  idempotent.
- Codex CLI hook installer: a stubbed, clearly-labelled placeholder
  (`Codex hook install is not fully implemented yet`) behind a stable interface,
  ready for future expansion.

## Capabilities

### New Capabilities

- `config-management`: default config, OS-specific path resolution, and the
  init/load/save lifecycle for `~/.agent-voice/config.json`.
- `tts-speaker`: platform detection and the macOS / Windows / unsupported speaker
  implementations, including safe argument handling and the PowerShell escape
  helper.
- `cli-commands`: the `init`, `speak`, `say`, and `install` command surface, their
  flags, error messages, and exit codes.
- `claude-hook-install`: locating, backing up, and non-destructively merging hooks
  into the Claude Code settings file.
- `codex-hook-install`: the stubbed Codex hook installer interface and placeholder
  behaviour.

### Modified Capabilities

<!-- None: this is a greenfield project with no existing specs. -->

## Impact

- New project; no existing code is modified.
- Runtime dependency: `commander`. Dev dependencies: `typescript`, `tsx`,
  `@types/node`, `vitest`, `@vitest/coverage-v8`.
- Filesystem side effects at runtime:
  - Reads/writes `~/.agent-voice/config.json`.
  - On `install --target claude`: backs up and modifies `~/.claude/settings.json`.
- Process side effects at runtime: spawns `say` (macOS) or `powershell` / `pwsh`
  (Windows) to produce audio.
- No network access in v1.
