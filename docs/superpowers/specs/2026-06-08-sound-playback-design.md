# agent-voice — Sound Playback Design (2026-06-08)

## Summary

Extend agent-voice so an event can play a **pre-recorded audio file** (e.g. an
`.m4a`) instead of speaking the TTS message. Motivating use case: play a
"level-up" sound on task completion via the existing Claude `Stop` hook.

Authoritative spec: OpenSpec change `add-sound-playback`. This file records the
design and locked decisions.

## Locked decisions

| Decision | Choice |
| --- | --- |
| Per-event behavior | **Sound instead of TTS**: if `sounds[event]` is set, play it; else speak `messages[event]` |
| Build process | Full workflow — OpenSpec change → TDD → Codex/superpowers review |
| Config shape | Optional `sounds` map keyed by event (`done`/`needInput`/`permission`/`error`), values are absolute file paths or `null` |
| Backward compatibility | `sounds` is optional; configs without it behave exactly as before |
| macOS engine | `spawn("afplay", [file])` (native `.m4a`, blocks) |
| Windows engine | `powershell` + WPF `System.Windows.Media.MediaPlayer` (plays `.m4a` via Media Foundation; STA is `powershell`'s default); file path escaped via `escapePowerShellSingleQuoted` |
| Unsupported platform | clear error, no playback |
| Ad-hoc command | new `agent-voice play "<file>"` (symmetric with `say`) |

## Architecture

New `src/player/` mirrors `src/speaker/`:

- `player/index.ts` — `getPlayer(platform, runner): Player` selecting the impl.
- `player/macos.ts` — `buildAfplayArgs(file)` + `createMacosPlayer(runner)`.
- `player/windows.ts` — `buildPlayerScript(file)` (WPF MediaPlayer, escaped path,
  waits for the clip), `buildPowerShellArgs(script)`, `createWindowsPlayer(runner)`.
- `player/unsupported.ts` — `createUnsupportedPlayer(platform)` → rejects.

`interface Player { play(filePath: string): Promise<void> }`. Players use the same
injected `CommandRunner` as speakers, so tests assert the exact command/args with
**no real audio**. The handler verifies the file exists before playing (clear
error + non-zero exit otherwise).

## Data flow

`speak --event <e>`:
1. validate event → load config.
2. `soundPath = config.sounds?.[e] ?? null`.
3. if `soundPath`: ensure the file exists, then `getPlayer().play(soundPath)`.
4. else: existing TTS path (`getSpeaker().speak(messages[e], voice)`).

`play <file>`: ensure the file exists, then `getPlayer().play(file)`.

## Config

`DEFAULT_CONFIG.sounds = { done: null, needInput: null, permission: null, error: null }`.
`loadConfig` validation: `sounds` is optional; when present it must be an object
whose values are `string` or `null`.

## Error handling

- Missing sound file → clear error naming the path, exit 1 (never spawn a player).
- Unsupported platform → clear error.
- Player process failure (non-zero / signal) → error, exit 1 (via the shared
  runner contract).

## Testing

- player unit tests (mock runner): macOS args; Windows script contains
  `MediaPlayer` + the escaped path; unsupported rejects without spawning; index
  selection mapping.
- handler tests: `speak` plays the sound when configured (fake player) and falls
  back to TTS otherwise; `play` plays a file, errors on missing arg/file.
- config tests: `sounds` in DEFAULT_CONFIG; a config WITHOUT `sounds` still loads;
  validation rejects a malformed `sounds`.
- Manual: actually play `dq_level_up.m4a` on Windows (real audio) — not in CI.

## Hooking it up

No new hook. `agent-voice install --target claude` already maps
`Stop → agent-voice speak --event done`; once `sounds.done` points at the m4a,
that hook plays the sound on completion.

## Non-goals (this change)

- No volume/seek control for sound playback (uses the file as-is).
- No format conversion; relies on OS codecs (`.m4a` supported on macOS + Windows).
- No `~`/relative-path expansion; paths are used as given (document absolute paths).
