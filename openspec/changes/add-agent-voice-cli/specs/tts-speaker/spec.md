## ADDED Requirements

### Requirement: Platform-based speaker selection

The system SHALL select a speaker implementation based on the operating system:
`darwin` selects the macOS speaker, `win32` selects the Windows speaker, and any
other platform selects the unsupported speaker.

#### Scenario: macOS selects the say-based speaker
- **WHEN** the platform is `darwin`
- **THEN** the macOS speaker is selected

#### Scenario: Windows selects the SpeechSynthesizer speaker
- **WHEN** the platform is `win32`
- **THEN** the Windows speaker is selected

#### Scenario: Other platforms select the unsupported speaker
- **WHEN** the platform is neither `darwin` nor `win32`
- **THEN** the unsupported speaker is selected

### Requirement: macOS speaker uses the say command safely

The macOS speaker SHALL speak text by invoking `say` via `spawn` with the text
passed as a discrete argument (never interpolated into a shell string). When a
macOS voice is configured it SHALL be passed using `-v <voice>`.

#### Scenario: Speaks text as a spawn argument
- **WHEN** the macOS speaker speaks `"hello"` with no voice configured
- **THEN** it runs `say` with an argument array whose last element is `"hello"`
- **AND** it does not launch a shell

#### Scenario: Configured voice is applied
- **WHEN** the macOS speaker speaks with `voice.macos` set to `"Alex"`
- **THEN** the argument array contains `-v` immediately followed by `Alex`

#### Scenario: Special characters are passed literally
- **WHEN** the macOS speaker speaks ``"`$(rm -rf /)`"``
- **THEN** the exact string is passed as a single `say` argument and is not
  executed as a command

### Requirement: Windows speaker uses System.Speech with rate and volume

The Windows speaker SHALL speak text using
`System.Speech.Synthesis.SpeechSynthesizer` driven through PowerShell launched via
`spawn`. It SHALL apply the configured `rate` and `volume`, and SHALL select the
configured Windows voice when one is set.

#### Scenario: Generates a SpeechSynthesizer invocation
- **WHEN** the Windows speaker speaks `"hi"`
- **THEN** the PowerShell script it runs constructs a
  `System.Speech.Synthesis.SpeechSynthesizer` and calls `Speak`

#### Scenario: Volume and rate are applied
- **WHEN** the Windows speaker speaks with `volume: 50` and a rate value
- **THEN** the script sets the synthesizer `Volume` to `50` and sets a `Rate`

### Requirement: Safe PowerShell text escaping

The system SHALL provide a dedicated function that escapes arbitrary text for safe
inclusion inside a PowerShell single-quoted string literal, such that the text is
always treated as literal data and never executed.

#### Scenario: Single quotes are doubled
- **WHEN** the escape function is given `it's`
- **THEN** the result encodes the apostrophe by doubling it (`it''s`)

#### Scenario: Injection payloads remain inert
- **WHEN** the escape function is given `'; Remove-Item C:\ -Recurse; '`
- **THEN** the result, when placed inside a single-quoted PowerShell literal,
  represents the original characters as data and does not form executable
  PowerShell commands

#### Scenario: Newlines and metacharacters survive
- **WHEN** the escape function is given text containing newlines, `$`, backtick,
  and `"` characters
- **THEN** those characters are preserved literally in the resulting literal

### Requirement: Unsupported platform fallback

On an unsupported platform the speaker SHALL NOT attempt to produce audio and SHALL
fail with a clear message naming the unsupported platform.

#### Scenario: Unsupported platform reports clearly
- **WHEN** the unsupported speaker is asked to speak
- **THEN** it raises an error (or rejects) with a message stating the platform is
  not supported
- **AND** no audio subprocess is spawned

### Requirement: Speaker contract

Every speaker SHALL expose a `speak` function that accepts the text and the
relevant voice configuration and returns a `Promise<void>` that resolves when
speech completes and rejects when the underlying process fails.

#### Scenario: Successful speech resolves
- **WHEN** the underlying TTS process exits with code 0
- **THEN** the returned promise resolves

#### Scenario: Failed speech rejects
- **WHEN** the underlying TTS process exits with a non-zero code
- **THEN** the returned promise rejects with an informative error
