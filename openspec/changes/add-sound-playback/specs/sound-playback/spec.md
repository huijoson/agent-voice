## ADDED Requirements

### Requirement: Per-event sound configuration

The configuration SHALL support an optional `sounds` object keyed by event name
(`done`, `needInput`, `permission`, `error`), where each value is an absolute file
path string or `null`. The default configuration SHALL include `sounds` with all
events set to `null`. A configuration file that omits `sounds` entirely SHALL
remain valid and behave as if all sounds are `null`.

#### Scenario: Default config includes null sounds
- **WHEN** the default configuration is read
- **THEN** it contains a `sounds` object with `done`, `needInput`, `permission`,
  and `error` all set to `null`

#### Scenario: Config without sounds still loads
- **WHEN** a config file that has no `sounds` key is loaded
- **THEN** loading succeeds
- **AND** every event is treated as having no sound

#### Scenario: Malformed sounds is rejected
- **WHEN** a config file has a `sounds` value that is not an object of
  string-or-null values
- **THEN** loading fails with a clear, actionable error

### Requirement: Platform-based player selection

The system SHALL select an audio-file player based on the operating system:
`darwin` selects the macOS player, `win32` selects the Windows player, and any
other platform selects an unsupported player.

#### Scenario: macOS selects the afplay player
- **WHEN** the platform is `darwin`
- **THEN** the macOS player is selected

#### Scenario: Windows selects the MediaPlayer player
- **WHEN** the platform is `win32`
- **THEN** the Windows player is selected

#### Scenario: Other platforms select the unsupported player
- **WHEN** the platform is neither `darwin` nor `win32`
- **THEN** the unsupported player is selected

### Requirement: macOS plays files via afplay safely

The macOS player SHALL play an audio file by invoking `afplay` via `spawn` with
the file path passed as a discrete argument (never interpolated into a shell
string).

#### Scenario: Plays the file as a spawn argument
- **WHEN** the macOS player plays `/tmp/cue.m4a`
- **THEN** it runs `afplay` with an argument array whose last element is
  `/tmp/cue.m4a`
- **AND** it does not launch a shell

### Requirement: Windows plays files via MediaPlayer safely

The Windows player SHALL play an audio file using
`System.Windows.Media.MediaPlayer` driven through PowerShell launched via `spawn`,
waiting for playback to finish. The file path SHALL be escaped for a PowerShell
single-quoted literal so it is treated as literal data.

#### Scenario: Generates a MediaPlayer invocation
- **WHEN** the Windows player plays a file
- **THEN** the PowerShell script it runs constructs a
  `System.Windows.Media.MediaPlayer` and opens the file

#### Scenario: Path is escaped
- **WHEN** the Windows player plays a path containing a single quote
- **THEN** the quote is doubled in the generated script so the path stays literal

### Requirement: Unsupported platform fallback

On an unsupported platform the player SHALL NOT attempt playback and SHALL fail
with a clear message naming the platform.

#### Scenario: Unsupported platform reports clearly
- **WHEN** the unsupported player is asked to play a file
- **THEN** it raises an error (or rejects) stating the platform is not supported
- **AND** no playback subprocess is spawned

### Requirement: speak plays a configured sound instead of TTS

The `speak` command SHALL play the event's configured sound file with the platform player when `sounds[event]` is a non-empty path, and SHALL otherwise speak the configured `messages[event]` text as before.

#### Scenario: Configured sound is played
- **WHEN** the user runs `speak --event done` and `sounds.done` is set to an
  existing file
- **THEN** the file is played via the platform player
- **AND** the TTS message is not spoken

#### Scenario: Falls back to TTS when no sound is set
- **WHEN** the user runs `speak --event done` and `sounds.done` is `null` or absent
- **THEN** the configured `messages.done` text is spoken

#### Scenario: Missing sound file errors clearly
- **WHEN** the user runs `speak --event done` and `sounds.done` points at a file
  that does not exist
- **THEN** a clear error naming the path is printed
- **AND** the process exits with a non-zero code
- **AND** no player subprocess is spawned

### Requirement: play command

The CLI SHALL provide `agent-voice play "<file>"` that plays an arbitrary audio
file with the platform player, independent of config. An empty or missing file
argument, or a path that does not exist, SHALL print a clear error and exit with a
non-zero code.

#### Scenario: Plays an arbitrary file
- **WHEN** the user runs `agent-voice play "/tmp/cue.m4a"` and the file exists
- **THEN** the file is played via the platform player

#### Scenario: Missing file argument errors
- **WHEN** the user runs `agent-voice play` with no file argument
- **THEN** a clear error is printed and the process exits non-zero

#### Scenario: Nonexistent file errors
- **WHEN** the user runs `agent-voice play "/tmp/nope.m4a"` and the file does not
  exist
- **THEN** a clear error naming the path is printed and the process exits non-zero
