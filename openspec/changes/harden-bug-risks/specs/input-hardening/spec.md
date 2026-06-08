## ADDED Requirements

### Requirement: Config voice fields are validated on load

`loadConfig` SHALL reject a config whose `voice` field contains a value of the
wrong type, failing at load time with an actionable error that names the offending
field and the config path. Specifically `voice.rate` and `voice.volume` MUST be
finite numbers (not `NaN`, `Infinity`, strings, or other types), and
`voice.macos` / `voice.windows` MUST each be a `string` or `null`. A config with
valid voice fields MUST continue to load unchanged.

#### Scenario: Non-numeric rate is rejected
- **WHEN** a config is loaded whose `voice.rate` is the string `"fast"`
- **THEN** `loadConfig` throws an error naming `voice.rate` and the config path
- **AND** no `NaN` value is ever passed to the speaker

#### Scenario: Non-finite volume is rejected
- **WHEN** a config is loaded whose `voice.volume` is `null` or `NaN`
- **THEN** `loadConfig` throws an error naming `voice.volume`

#### Scenario: Wrong-typed voice name is rejected
- **WHEN** a config is loaded whose `voice.macos` is a number
- **THEN** `loadConfig` throws an error naming `voice.macos`

#### Scenario: Valid voice config still loads
- **WHEN** a config is loaded whose `voice` is `{ macos: null, windows: "Zira", rate: 1, volume: 100 }`
- **THEN** `loadConfig` resolves with the parsed config unchanged

### Requirement: macOS say treats the message as literal text

`buildSayArgs` SHALL construct the `say` argument vector so that the message text
is never interpreted as a command-line option, including when the message begins
with `-`. The argument vector MUST place an end-of-options `--` marker immediately
before the message text, both with and without a configured `voice.macos`.

#### Scenario: Message starting with a dash is spoken literally
- **WHEN** `buildSayArgs("-rf my files", { macos: null, ... })` is called
- **THEN** the returned args place `--` immediately before `"-rf my files"`
- **AND** the message is the final argument

#### Scenario: End-of-options marker is present with a configured voice
- **WHEN** `buildSayArgs("hello", { macos: "Alex", ... })` is called
- **THEN** the returned args include `-v`, `"Alex"`, then `--`, then `"hello"` in order

### Requirement: Windows player fails fast on unplayable files

The Windows audio-player PowerShell script SHALL detect a media-load failure
(`MediaFailed`) and throw promptly with a clear, agent-voice-prefixed error,
rather than waiting for the full duration-probe timeout when a file is corrupt or
is not a playable audio format.

#### Scenario: Corrupt file fails fast
- **WHEN** the player opens a file that raises `MediaFailed`
- **THEN** the script throws an agent-voice-prefixed error without waiting for the
  full 10-second duration-probe loop

#### Scenario: Valid file still plays to completion
- **WHEN** the player opens a valid audio file whose duration becomes known
- **THEN** the script plays the clip and sleeps for its duration before closing,
  unchanged from current behavior
