## 1. Setup & dependencies

- [ ] 1.1 Add a tiny TOML parse/serialize dependency (`smol-toml` preferred; `@iarna/toml` fallback) to `package.json` and pin the version
- [ ] 1.2 Add Codex config path helpers to `src/utils/paths.ts`: `getCodexConfigPath(homeDir?)` and `getCodexConfigDir(homeDir?)`, honoring `$CODEX_HOME` (default `~/.codex`), with unit tests in `src/utils/paths.test.ts`

## 2. Notify dispatcher (TDD)

- [ ] 2.1 Write failing tests for `runCodexNotify` in `src/cli.test.ts` (or a dedicated test): turn-complete → speaks `done`; unknown type → no speak, exit 0; missing/invalid-JSON final arg → no speak, exit 0; partial payload (missing optional fields) → still speaks `done`
- [ ] 2.2 Implement `runCodexNotify(argv, deps)`: read the final argv element, `JSON.parse` defensively, and when `type === "agent-turn-complete"` reuse the `speak --event done` path; never throw back into Codex (catch-all → exit 0)
- [ ] 2.3 Register a hidden `codex-notify` command in `buildProgram` wired to `runCodexNotify`; keep it out of the user-facing help where practical
- [ ] 2.4 Confirm tests pass

## 3. Real installer (TDD)

- [ ] 3.1 Rewrite `src/hooks/codex.test.ts` for the real installer using a temp `homeDir`: no-notify → sets `notify`, `changed:true`, `implemented:true`; idempotent re-run → `changed:false`, no backup; foreign `notify` → untouched + warning + `changed:false`; existing config backed up before write; malformed TOML → throws, file unchanged
- [ ] 3.2 Implement `installCodexHook()` in `src/hooks/codex.ts`: resolve path via helpers, create dir/file if needed, read+parse TOML, apply the non-destructive merge rules from design Decision 4, back up byte-for-byte before any write (reuse/extract `formatBackupTimestamp`), serialize and write, return `{ configPath, backupPath, created, changed, implemented: true }`
- [ ] 3.3 Confirm installer tests pass

## 4. CLI wiring

- [ ] 4.1 Update `src/cli.test.ts` so `install --target codex` expects exit code `0` on success (replace the exit-code-2 stub expectation)
- [ ] 4.2 Update `runInstall` codex branch in `src/cli.ts` to return `0` when `installCodexHook()` resolves; remove the `implemented ? 0 : 2` exit-code-2 branch
- [ ] 4.3 Add `installCodexHook` real signature to `CliDeps` wiring in `src/index.ts` if its shape changed

## 5. Verification & docs

- [ ] 5.1 Run `npm test` — all tests pass (including the rewritten codex + new dispatcher tests)
- [ ] 5.2 Run `npm run typecheck` and `npm run build` — clean
- [ ] 5.3 Manually verify end-to-end against a real `~/.codex/config.toml` (install writes `notify`; simulate a Codex call: `agent-voice codex-notify '{"type":"agent-turn-complete"}'` speaks the done message)
- [ ] 5.4 Update `README.md`: mark Codex install supported; note it currently notifies only on turn-complete (with pointer to upstream issues for needInput/approval/error)
