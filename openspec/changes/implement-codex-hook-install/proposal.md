## Why

`agent-voice install --target codex` is currently a stub: it installs nothing, prints a "not fully implemented yet" message, and exits with code 2. Codex CLI users must wire up voice notifications by hand, while Claude Code users get a one-command install. This change makes the Codex path a real, non-destructive installer that mirrors the Claude experience.

## What Changes

- Replace the `installCodexHook()` stub with a real installer that sets the single `notify` program key in Codex CLI's config (`~/.codex/config.toml`, TOML format).
- Add a hidden `agent-voice codex-notify` dispatcher subcommand that Codex invokes on each notification. Codex appends the event JSON as the final argv token (no stdin); the dispatcher parses it, and when `type == "agent-turn-complete"` speaks the configured `done` message. It tolerates malformed/partial payloads and unknown event types without breaking Codex.
- **Event-mapping reality**: Codex's external `notify` program currently receives only the `agent-turn-complete` event (authoritative, from Codex source). `needInput` / `permission` / `error` are **not deliverable** via `notify` today (tracked upstream in openai/codex issues #11808, #19921, #13478), so v1 maps only `agent-turn-complete → done`. The dispatcher is written so new event types map in trivially when Codex adds them.
- Set `notify = ["agent-voice", "codex-notify"]` non-destructively: back up the existing config before any write; idempotent re-runs make no change; if `notify` is already set to a *foreign* command, leave it untouched and warn (mirroring the Claude installer's conservative, non-clobbering contract) rather than overwriting another tool's hook.
- Wire the new result into `runInstall` so `--target codex` returns `0` on success (the existing exit-code-2 "not implemented" branch is removed once `implemented: true` is reported).
- **BREAKING** (behavioral, internal): `installCodexHook()` return type changes from the `{ implemented: false; message }` stub to a result mirroring `InstallResult` (config path, backup path, created/changed flags). No public CLI flag changes.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `codex-hook-install`: Requirements change from "stub that reports not-yet-implemented and completes without throwing" to "real, non-destructive installer that registers a Codex `notify` hook, backs up existing config, is idempotent, and maps Codex event types to agent-voice events."

## Impact

- **Code**: `src/hooks/codex.ts` (real installer), `src/cli.ts` (`runInstall` codex branch returns 0; new hidden `codex-notify` command + `runCodexNotify` handler), new dispatcher logic, `src/utils/paths.ts` (Codex config path helpers).
- **Tests**: `src/hooks/codex.test.ts` rewritten for the real installer; new tests for the notify dispatcher (event mapping, malformed payload, unknown type) and path helpers; `src/cli.test.ts` codex-install + codex-notify expectations updated.
- **Dependencies**: Adds a small TOML parse/serialize dependency (parse → set `notify` → re-serialize is required for safe idempotency and foreign-hook detection; hand-rolling TOML is rejected). Exact library chosen in design.md.
- **Config / users**: Writes to `~/.codex/config.toml`; creates a timestamped backup. No change to the agent-voice config schema.
- **Docs**: README install section updated to mark Codex as supported.
