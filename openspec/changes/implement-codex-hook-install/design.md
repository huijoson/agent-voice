## Context

`agent-voice install --target codex` is a stub (`src/hooks/codex.ts`) that prints "not fully implemented yet" and makes `runInstall` return exit code 2. The Claude path (`src/hooks/claude.ts`) is a real, non-destructive, idempotent installer that merges command-hooks into `~/.claude/settings.json` and backs the file up first. This change brings Codex to parity within the limits of what Codex's notification system actually supports.

**Researched constraints (Codex CLI, current; sources in proposal/impact):**
- Config lives at `~/.codex/config.toml` (`$CODEX_HOME`, default `~/.codex`), **TOML** format.
- Notifications use a single top-level key: `notify = ["program", "args", ...]`. It is **one program for all events**, not a per-event list of hooks.
- Codex invokes the program with the event JSON **appended as the final argv token** (no stdin): `program args… '<json>'`.
- The external `notify` program receives **only** `type == "agent-turn-complete"`. There is no needInput / approval / error event delivered to `notify` today (upstream issues #11808, #19921, #13478).
- Payload keys are kebab-case and version-dependent (`type`, `turn-id`, `input-messages`, `last-assistant-message`, plus newer `cwd`, `thread-id`, `client`). Scripts must read the **last** argv and tolerate missing keys.

## Goals / Non-Goals

**Goals:**
- Real `installCodexHook()` that registers our notify program in `~/.codex/config.toml`.
- Non-destructive + idempotent + foreign-hook-safe, mirroring the Claude installer's safety contract (backup before write, no clobber, conservative skips, no churn on re-run).
- A robust dispatcher that maps `agent-turn-complete → done` and never breaks Codex on bad input.
- `install --target codex` returns `0` on success; remove the exit-code-2 "not implemented" branch.
- Extensible event mapping so future Codex events plug in with minimal change.

**Non-Goals:**
- Mapping `needInput` / `permission` / `error` from Codex — Codex's `notify` cannot deliver these yet. Out of scope until upstream support lands.
- Configuring `tui.notifications` (terminal/desktop notifications). It's a separate key that does **not** invoke our program (no voice), so it's out of scope.
- Preserving TOML comments/formatting on rewrite (see Risks).
- Coexisting with another tool's `notify` via a chaining wrapper. v1 refuses to clobber and warns instead.

## Decisions

### Decision 1 — Dispatcher is a hidden `agent-voice codex-notify` subcommand (not a standalone script)
Codex calls `notify = ["agent-voice", "codex-notify"]`. The new hidden command's handler (`runCodexNotify`) reads the **last** `process.argv` element, `JSON.parse`es it, and when `type === "agent-turn-complete"` runs the same speak path as `speak --event done`.
- **Why:** Reuses the existing installed bin — no extra script file to write into `~/.codex`, no path/quoting/permission management, no second thing to keep in sync. Matches how the Claude hook reuses `agent-voice speak`.
- **Alternative considered:** Write a standalone `codex-notify.(js|sh)` into `~/.codex` and point `notify` at it. Rejected: file lifecycle, executable-bit/shebang portability across Windows/macOS, and absolute-path management.
- **Robustness:** Unknown event type, missing argv, or unparseable JSON → exit `0` silently (do nothing). The dispatcher must never throw back into Codex's turn loop. Only an actual speak failure is surfaced (and even then we prefer a quiet non-zero without noisy output, TBD in tasks).

### Decision 2 — Use a small TOML library for parse → set `notify` → serialize
Add a tiny, modern, dependency-free TOML library (candidate: **`smol-toml`** — TOML 1.0, ESM, no transitive deps; `@iarna/toml` is the fallback). Read existing config, set the single `notify` key, re-serialize.
- **Why:** Idempotency and foreign-hook detection require *reading* the current `notify` value, which means real parsing. Single-key TOML can't be safely "appended" like Claude's hook arrays.
- **Alternative considered:** Hand-rolled regex/string append. Rejected: cannot reliably detect/replace an existing `notify`, cannot parse multi-line arrays, and risks corrupting the user's config.
- **Consistency:** The project currently has only `commander` as a runtime dep; adding one tiny parser is acceptable and is the minimum needed to do this safely.

### Decision 3 — `notify` command form assumes `agent-voice` is on PATH
Write `notify = ["agent-voice", "codex-notify"]`, consistent with the Claude hook which writes `agent-voice speak --event done` (also PATH-assuming).
- **Why:** Consistency with the existing installer; avoids brittle absolute paths to a `dist/` that can move.
- **Trade-off:** If `agent-voice` isn't globally installed, the hook won't resolve. Acceptable and symmetric with the Claude path; documented in README.

### Decision 4 — Non-destructive, conservative merge (mirror Claude installer)
- `notify` absent → set it to ours; create config dir/file if needed (`created: true`).
- `notify` already equals ours → idempotent no-op (`changed: false`), no backup, no write.
- `notify` present but **foreign** → leave it untouched, log a clear warning telling the user how to add ours manually, return `changed: false`. Do **not** overwrite another tool's hook.
- Any write is preceded by a timestamped byte-for-byte backup (reuse `formatBackupTimestamp` from `claude.ts`, extracting it to a shared util if convenient).
- Refuse to operate on a config that exists but isn't valid TOML / isn't a table — throw a clear error rather than overwrite (mirrors Claude's "not valid JSON / not an object" guards).

### Decision 5 — `installCodexHook()` result shape mirrors the Claude `InstallResult`
Return `{ configPath, backupPath: string | null, created: boolean, changed: boolean }` and drop the `{ implemented: false }` stub shape. `runInstall` returns `0` whenever the call resolves; the exit-code-2 branch is deleted.

## Risks / Trade-offs

- **TOML comments/formatting lost on rewrite** → Mitigation: back up the original file byte-for-byte before writing (same guarantee the Claude installer gives). Document that re-serialization may reorder keys / drop comments. (Open question below on a comment-preserving editor.)
- **Only `done` is wired; users may expect needInput/permission/error to "just work" like Claude** → Mitigation: the installer's success message and README explicitly state Codex currently only notifies on turn-complete, with a pointer to upstream issues.
- **Payload schema is version-dependent** → Mitigation: dispatcher keys off `type` only and reads the last argv defensively; never assumes optional fields exist.
- **`notify` can hold only one program; we refuse to clobber a foreign one** → Mitigation: clear warning + manual-merge guidance; chaining wrapper deferred to a future change.
- **New TOML dependency** → Mitigation: pick a tiny zero-transitive-dep library; pin version; it's the minimum needed for safe idempotency.

## Migration Plan

- Pure addition + internal behavior change; no agent-voice config-schema migration.
- Users who previously ran `install --target codex` only got the stub message (nothing was written), so there is no prior state to migrate.
- Rollback: revert the change; users can delete the `notify` key (or restore the `.bak-<timestamp>` file the installer created).

## Open Questions

- Comment preservation: accept key reordering / comment loss on rewrite (current plan, backed by backup), or invest in a comment-preserving TOML editor? Default: accept, rely on backup.
- On dispatcher speak failure, exit `0` (never disturb Codex) or non-zero for debuggability? Leaning exit `0` + optional stderr line.
- Should the success message also offer to set `tui.notifications = ["approval-requested"]` as a stop-gap for approval alerts (desktop only, no voice)? Default: no (out of scope), maybe a README note.
