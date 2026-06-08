## Why

A bug-risk audit of `src/` found three input-handling weaknesses that turn bad
(but plausible) input into a broken or confusing runtime experience: an
unvalidated numeric config field can inject `NaN` into the Windows TTS script and
silently kill speech, a macOS message beginning with `-` is misread by `say` as a
flag, and a corrupt/non-audio file makes the Windows player spin for the full
10-second timeout before failing. Each fails far from its cause with a cryptic or
slow symptom; hardening the inputs makes failures fast, local, and actionable.

## What Changes

- **Config validation (HIGH):** `loadConfig`/`assertValidConfig` validate that
  `voice.rate` and `voice.volume` are finite numbers and that `voice.macos` /
  `voice.windows` are `string | null`. An invalid voice field fails at load time
  with an actionable message instead of producing `$speak.Rate = NaN;` and a
  silent speech failure on Windows.
- **macOS `say` end-of-options marker (MEDIUM):** `buildSayArgs` inserts a `--`
  end-of-options separator before the message text so a message that *starts
  with* `-` is spoken literally rather than parsed by `say` as a flag.
- **Windows player fail-fast (MEDIUM):** the WPF `MediaPlayer` script registers a
  `MediaFailed` handler so a corrupt or non-audio file throws promptly with a
  clear error instead of spinning until the 10-second duration-probe timeout.
- **Deferred (LOW, documented only):** `runInstall` reports success for the Codex
  target even though `installCodexHook` returns `{ implemented: false }`. Recorded
  as a follow-up task; not changed in this change.

No public CLI surface, config schema shape, or message defaults change. Existing
behavior for valid input is preserved; only invalid/edge input is handled better.

## Capabilities

### New Capabilities
- `input-hardening`: Validation and safe construction of external inputs — config
  voice fields, OS command arguments, and audio-file playback — so malformed or
  edge-case input fails fast and locally rather than producing cryptic, silent, or
  slow failures.

### Modified Capabilities
<!-- None: prior changes (add-agent-voice-cli, add-sound-playback) are not yet
     archived into openspec/specs/, so there is no canonical spec to delta. -->

## Impact

- **Code:** `src/config.ts` (`assertValidConfig`), `src/speaker/macos.ts`
  (`buildSayArgs`), `src/player/windows.ts` (`buildPlayerScript`).
- **Tests:** `src/config.test.ts`, `src/speaker/macos.test.ts`,
  `src/player/windows.test.ts` gain cases for the new validation/escaping/fail-fast
  behavior; all existing tests stay green.
- **Dependencies / APIs:** none. No new packages; no change to the on-disk config
  schema or the `agent-voice` command surface.
- **Runtime:** stricter config loading may now reject a previously-tolerated
  malformed config (e.g. `voice.rate: "fast"`) with a clear error — intended.
