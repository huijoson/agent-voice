## 1. Config voice validation (Risk A — HIGH)

- [x] 1.1 Add failing tests to `src/config.test.ts`: `loadConfig` rejects `voice.rate` as a string, `voice.volume` as `null`/string, and `voice.macos`/`voice.windows` as a number; error names the field + path
- [x] 1.2 Add a passing test that `voice.volume: 0` and a string `voice.windows` are accepted (no false rejection)
- [x] 1.3 Extend `assertValidConfig` in `src/config.ts`: require `Number.isFinite` for `voice.rate`/`voice.volume` and `string|null` for `voice.macos`/`voice.windows`, appending to the existing `problems[]` list
- [x] 1.4 Run `src/config.test.ts` green

## 2. macOS say end-of-options marker (Risk B — MEDIUM)

- [x] 2.1 Add failing tests to `src/speaker/macos.test.ts`: `buildSayArgs` places `--` immediately before the text, with and without a configured voice; a `-`-leading message is the final arg
- [x] 2.2 Update `buildSayArgs` in `src/speaker/macos.ts` to insert `--` before the text in both branches
- [x] 2.3 Run `src/speaker/macos.test.ts` green; update the function's doc comment to reflect the fix

## 3. Windows player fail-fast (Risk C — MEDIUM)

- [x] 3.1 Add failing test(s) to `src/player/windows.test.ts`: `buildPlayerScript` pumps the dispatcher and surfaces failure promptly; valid-playback path preserved
- [x] 3.2 Update `buildPlayerScript` in `src/player/windows.ts` — FIRST attempt (MediaFailed flag + Start-Sleep poll) was proven INEFFECTIVE by a real Windows smoke test (10.9s, never hit the failure branch); corrected to a `DispatcherFrame`/`PushFrame` message pump so MediaOpened/MediaFailed are actually delivered
- [x] 3.3 Run `src/player/windows.test.ts` green

## 4. Verification

- [x] 4.1 `npm test` — full Vitest suite green (124 tests)
- [x] 4.2 `npm run typecheck` — no type errors
- [x] 4.3 `npm run build` — compiles cleanly
- [x] 4.4 Manual smoke notes recorded in the result report. Windows fail-fast: corrupt file rejected in ~1.3s (was ~10.9s before the dispatcher-pump fix). macOS `say --` and valid-file audible playback: NOT run in this non-interactive session (no macOS; the headless Windows session cannot access the audio render endpoint) — see report limitations.

## 5. Risk D — Codex install exit code (LOW)

- [x] 5.1 `runInstall` no longer reports success for the not-yet-implemented Codex target: it now returns the result's `implemented` flag as a distinct preview exit code `2` (vs `1` for hard errors), still printing the friendly message. Covered by an updated `cli.test.ts` case and documented in the README.
