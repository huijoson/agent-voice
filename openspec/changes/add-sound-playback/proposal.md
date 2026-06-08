## Why

agent-voice v1 only speaks text via system TTS. Users often want a distinctive,
pre-recorded cue instead — e.g. a game "level-up" sound when a task completes —
which is more recognizable than synthesized speech and lets people use their own
audio. This adds optional per-event playback of an audio file (such as `.m4a`),
reusing the existing event model and Claude hook.

## What Changes

- New optional `sounds` map in `config.json`, keyed by event
  (`done`/`needInput`/`permission`/`error`), with absolute file paths or `null`.
- `speak --event <e>` plays `sounds[e]` when set, otherwise falls back to the
  existing TTS message (sound **instead of** TTS, per event).
- New `agent-voice play "<file>"` command for ad-hoc playback.
- New cross-platform player: macOS `afplay`; Windows WPF
  `System.Windows.Media.MediaPlayer` (handles `.m4a`); unsupported elsewhere.
- Safe file-path handling (spawn arg on macOS; single-quoted, escaped literal on
  Windows) and a clear error when the file is missing.

## Capabilities

### New Capabilities

- `sound-playback`: the `sounds` config field, the platform player
  implementations, the `speak` sound branch, and the `play` command.

### Modified Capabilities

<!-- None as separate delta files: the new behavior is captured wholly within the
     new `sound-playback` capability to keep this change self-contained while the
     base specs are still un-archived. -->

## Impact

- Backward compatible: `sounds` is optional; existing configs are unaffected.
- New runtime processes: `afplay` (macOS) or `powershell` WPF MediaPlayer
  (Windows) when a sound is played.
- New module `src/player/`; small additions to `config.ts`, `cli.ts`, `index.ts`,
  `types.ts`; README updates.
- No new dependencies; relies on OS-native audio codecs.
