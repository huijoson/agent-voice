## 1. Config: sounds field

- [x] 1.1 RED/GREEN add `SoundConfig` and optional `Config.sounds` to `types.ts`;
      `DEFAULT_CONFIG.sounds` = all-null; test asserts shape
- [x] 1.2 RED/GREEN `loadConfig` accepts a config WITHOUT `sounds` (backward compat)
- [x] 1.3 RED/GREEN `loadConfig` rejects a malformed `sounds` (not object of
      string|null) with an actionable error

## 2. Player module (test-first, mocked runner)

- [x] 2.1 RED/GREEN `player/macos.ts`: `buildAfplayArgs(file)` = `[file]`;
      `createMacosPlayer(runner)` runs `afplay`; rejects on runner failure
- [x] 2.2 RED/GREEN `player/windows.ts`: `buildPlayerScript(file)` uses
      `System.Windows.Media.MediaPlayer` with the escaped path; `createWindowsPlayer`
      runs `powershell`; path with a quote is doubled
- [x] 2.3 RED/GREEN `player/unsupported.ts`: rejects with a clear message, spawns
      nothing
- [x] 2.4 RED/GREEN `player/index.ts`: `getPlayer(platform, runner)` selection

## 3. CLI integration (test-first)

- [x] 3.1 RED/GREEN `runSpeak` plays `sounds[event]` (via injected player) when set
      and the file exists; falls back to TTS when null/absent
- [x] 3.2 RED/GREEN `runSpeak` errors (exit !=0, no spawn) when `sounds[event]`
      points at a missing file
- [x] 3.3 RED/GREEN `runPlay(file)`: plays an existing file; errors on empty arg;
      errors on nonexistent file
- [x] 3.4 Wire `play` command in commander; add `getPlayer` to `CliDeps`; wire real
      `getPlayer` in `index.ts`

## 4. Docs

- [x] 4.1 README: document `sounds` config, the `play` command, and that the
      existing Claude hook plays the sound once `sounds.done` is set

## 5. Verification & review

- [x] 5.1 `npm run typecheck`, `npm run build`, `npm test`, `npm run coverage` green
- [ ] 5.2 Independent review: `codex review` + superpowers; triage + fix with tests
- [x] 5.3 `openspec validate add-sound-playback --strict` passes
- [ ] 5.4 Manual real-audio test: set `sounds.done` to the m4a and play it on
      Windows (after asking the user) — not run in CI
