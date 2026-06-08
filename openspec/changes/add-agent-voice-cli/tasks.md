## 1. Toolchain & scaffolding

- [x] 1.1 `git init`, `openspec init`, and create the OpenSpec change proposal
- [x] 1.2 Add `package.json` (type: module, bin `agent-voice` → `dist/index.js`,
      scripts build/dev/start/typecheck/test/test:watch/coverage; deps commander;
      devDeps typescript, tsx, @types/node, vitest, @vitest/coverage-v8)
- [x] 1.3 Add `tsconfig.json` (strict, ES2022, NodeNext, outDir dist, rootDir src,
      excludes tests) and `vitest.config.ts` and `.gitignore`
- [x] 1.4 `npm install` and confirm `vitest` runs (empty pass) and `tsc --noEmit`
      succeeds on an empty `src`

## 2. Foundation (test-first)

- [x] 2.1 RED/GREEN `utils/platform.ts`: `getPlatform()` / platform predicates;
      tests cover darwin/win32/other mapping
- [x] 2.2 RED/GREEN `utils/shell.ts`: `escapePowerShellSingleQuoted(text)`; tests
      cover apostrophe doubling, injection payloads, newlines/`$`/backtick/`"`
      (also `defaultRunner` spawn wrapper, spawn mocked)
- [x] 2.3 RED/GREEN `utils/paths.ts`: `getHomeDir()`, `getConfigDir()`,
      `getConfigPath()`, Claude settings path; tests assert `.agent-voice/config.json`
      and `.claude/settings.json` resolution with an injectable home dir
- [x] 2.4 `types.ts`: `Config`, `VoiceConfig`, `Messages`, `EventName`,
      `CommandRunner`, `Speaker` interfaces (type-only; verified via typecheck)

## 3. Config module (test-first)

- [x] 3.1 RED/GREEN `DEFAULT_CONFIG` matches the spec exactly; test asserts shape
      and non-empty messages
- [x] 3.2 RED/GREEN `ensureConfigDir()` / `saveConfig()` write pretty JSON into a
      temp dir; round-trip test
- [x] 3.3 RED/GREEN `loadConfig()`: returns parsed config; throws "run init" when
      missing; throws parse error on invalid JSON (temp-dir tests)
- [x] 3.4 RED/GREEN `initConfig({ force })`: creates dir+file; protects existing;
      overwrites when force (temp-dir tests)

## 4. Speakers (test-first, mocked spawn)

- [x] 4.1 RED/GREEN `speaker/macos.ts`: builds `say` arg array; adds `-v <voice>`;
      passes text literally; resolves on exit 0, rejects on non-zero (mock runner)
- [x] 4.2 RED/GREEN `speaker/windows.ts`: builds PowerShell `SpeechSynthesizer`
      script via the escape helper; applies rate/volume/voice; mock-runner tests
      assert the command + that text is single-quote-escaped
- [x] 4.3 RED/GREEN `speaker/unsupported.ts`: rejects with clear message, spawns
      nothing
- [x] 4.4 RED/GREEN `speaker/index.ts`: `getSpeaker(platform)` selection mapping

## 5. CLI commands (integration tests)

- [x] 5.1 RED/GREEN command handlers for `init`, `speak --event`, `say`,
      `install --target` (pure functions taking injected config/speaker/io)
- [x] 5.2 RED/GREEN `speak` maps event→message, errors on unknown event (exit !=0),
      guides to init when config missing
- [x] 5.3 RED/GREEN `say` speaks literal text, errors on empty input
- [x] 5.4 `cli.ts`: wire commander; `index.ts`: shebang + `process.argv` entry +
      top-level error handling → non-zero exit
- [x] 5.5 Integration test: `init` then `speak --event done` core flow with a
      mocked speaker and temp home dir

## 6. Claude hook installer (test-first, fixtures)

- [x] 6.1 RED/GREEN creates `settings.json` when absent (temp home)
- [x] 6.2 RED/GREEN timestamped backup `settings.json.bak-YYYYMMDDHHmmss` is made
      from existing settings before write
- [x] 6.3 RED/GREEN non-destructive merge: fixture with existing keys+hooks keeps
      everything and adds Stop→done and Notification→needInput
- [x] 6.4 RED/GREEN idempotency: second run does not duplicate entries

## 7. Codex hook stub (test-first)

- [x] 7.1 RED/GREEN `hooks/codex.ts` `installCodexHook()` prints
      "Codex hook install is not fully implemented yet", returns without throwing,
      TODOs documented

## 8. Documentation

- [x] 8.1 Write `README.md`: purpose, install, build, local dev, init, test speech,
      install Claude hook, Windows/macOS limitations, security notes, roadmap
      (Codex hook, Edge TTS, OpenAI TTS, Tauri GUI, per-event voices, notifications)

## 9. Verification & review

- [x] 9.1 `npm run typecheck`, `npm run build`, `npm test`, `npm run coverage` all
      green; verify `dist/index.js` has a shebang
- [ ] 9.2 Independent review: `codex review` / `codex exec` + superpowers code
      review; triage and fix real findings with tests
- [ ] 9.3 Document the manual audio smoke test (macOS `say`, Windows SAPI) — not
      run in CI
- [ ] 9.4 `openspec validate add-agent-voice-cli --strict` passes
