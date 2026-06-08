## Context

`agent-voice` is a new, standalone TypeScript CLI. There is no existing codebase
to integrate with. The product requirements are fixed and detailed (see
`proposal.md` and the capability specs). This document records the cross-cutting
technical decisions that the capability specs assume.

The project lives at the repository root (`C:\coding\tts-alarm`, package name
`agent-voice`). Build output goes to `dist/`; the published binary is
`dist/index.js`.

## Goals / Non-Goals

**Goals:**

- Cross-platform spoken notifications (macOS + Windows) using only OS-native TTS.
- Zero secrets / zero network in v1.
- A small, modular, individually-testable codebase.
- Injection-safe handling of arbitrary user message text.
- Non-destructive, idempotent Claude Code hook installation.
- A stable extension point for a future Codex hook and future TTS engines.

**Non-Goals (v1):**

- No GUI / Tauri app.
- No cloud TTS (OpenAI, Azure, Edge TTS).
- No per-event distinct voices.
- No OS desktop notifications (config has a disabled `notification` flag reserved
  for later).
- No full Codex hook implementation (stub only).

## Decisions

1. **Language / module system.** TypeScript, `strict: true`, `target: ES2022`,
   `module`/`moduleResolution: NodeNext`, `outDir: dist`, `rootDir: src`,
   `"type": "module"`. NodeNext ESM means relative imports use explicit `.js`
   extensions in source.

2. **CLI parser.** `commander` only — no large framework.

3. **Speaker selection by platform.** `speaker/index.ts` chooses an
   implementation from `process.platform`: `darwin` → `macos.ts`, `win32` →
   `windows.ts`, otherwise `unsupported.ts`. Each speaker exposes the same
   `speak(text, voiceConfig)` returning `Promise<void>`.

4. **Process execution & injection safety.** All audio is produced with
   `child_process.spawn` using an argument array — never a concatenated shell
   string.
   - macOS: `spawn("say", [...optionalVoiceFlags, text])`. Text is a discrete
     argument, so quoting/metacharacters are inert.
   - Windows: we must run a PowerShell snippet, so the message text is embedded in
     a PowerShell **single-quoted** string literal. A dedicated
     `escapePowerShellSingleQuoted()` helper doubles every `'` (PowerShell's only
     escape inside single quotes), guaranteeing the text is treated as literal
     data, not code. PowerShell itself is launched via `spawn` with the script as
     a `-Command` argument array element.

5. **Testability via dependency injection.** Speakers and hook/config modules do
   not call `child_process`/`fs` directly at module scope. The command runner
   (a thin wrapper around `spawn`) is injected (with a real default), so unit
   tests assert the exact command + argument array that *would* run without
   producing audio. File-touching modules accept an overridable base directory so
   tests use temp dirs and never touch the real home directory.

6. **Config.** A single JSON file. `getConfigPath()` resolves
   `~/.agent-voice/config.json` cross-platform via `os.homedir()`.
   `DEFAULT_CONFIG` matches the spec exactly. `loadConfig()` throws a clear,
   actionable error ("run `agent-voice init` first") when the file is missing and
   a distinct error on invalid JSON.

7. **Claude hook merge strategy.** Target `~/.claude/settings.json`. Read existing
   JSON (or start from `{}`), back it up to `settings.json.bak-YYYYMMDDHHmmss`,
   then merge so that `hooks.Stop` and `hooks.Notification` each contain an entry
   running the corresponding `agent-voice speak` command. Existing hook entries
   are preserved; our entries are added only if not already present (idempotent).
   The exact `hooks` shape Claude expects can vary across versions, so the merge
   is conservative and the README documents the assumed shape and the
   `~/.claude/settings.json` location.

8. **Codex hook.** `hooks/codex.ts` exports `installCodexHook()` with the same
   signature shape as the Claude installer, prints the not-implemented message,
   and carries TODOs describing the intended future behaviour.

9. **Testing.** Vitest, test-first (TDD). `child_process.spawn` is mocked; config
   tests use temp dirs; hook tests use fixture `settings.json` files and assert
   pre-existing hooks survive the merge; the PowerShell escape helper has direct
   unit tests including injection payloads; `init`/`speak` core flows have
   integration tests. No test produces real audio, and the suite runs on macOS,
   Windows, and Linux CI.

## Risks / Trade-offs

- **Claude settings schema drift.** Claude Code's hooks format may differ from our
  assumed shape. Mitigation: conservative merge, always back up first, never
  delete existing keys, document assumptions, and keep the merge logic isolated
  and unit-tested so it is easy to adjust.
- **Windows PowerShell availability.** Some systems have `pwsh` (7+) but not
  Windows PowerShell, or vice versa. Mitigation: prefer `powershell` (present on
  all supported Windows) and document the requirement; the runner is injectable so
  the executable can be made configurable later.
- **Rate semantics differ per OS.** macOS `say` rate is words-per-minute; Windows
  SAPI rate is roughly -10..10. v1 implements Windows rate/volume and treats the
  config `rate` as best-effort, documenting the difference; macOS rate is a TODO.
- **Speaking is fire-and-forget-ish.** `speak` resolves when the TTS process
  exits; a non-zero exit surfaces a clear error and non-zero CLI exit code.
