## ADDED Requirements

### Requirement: init command

The CLI SHALL provide `agent-voice init` that initializes the configuration file.
It SHALL support a flag to force overwriting an existing config.

#### Scenario: init creates the config
- **WHEN** the user runs `agent-voice init` with no existing config
- **THEN** the default config file is created and the path is reported

#### Scenario: init reports when config already exists
- **WHEN** the user runs `agent-voice init` and a config already exists and the
  user declines overwrite
- **THEN** the existing config is preserved and the user is informed

### Requirement: speak command

The CLI SHALL provide `agent-voice speak --event <event>` that loads the config,
looks up `messages[event]`, and speaks it with the current platform's speaker. If
the event is not present in `messages`, the CLI SHALL print an error and exit with
a non-zero code. If the config file does not exist, the CLI SHALL instruct the user
to run `agent-voice init`.

#### Scenario: Known event is spoken
- **WHEN** the user runs `agent-voice speak --event done` with a valid config
- **THEN** the configured `messages.done` text is spoken via the platform speaker

#### Scenario: Unknown event exits non-zero
- **WHEN** the user runs `agent-voice speak --event nope`
- **THEN** an error naming the unknown event is printed
- **AND** the process exits with a non-zero code

#### Scenario: Missing config guides to init
- **WHEN** the user runs `agent-voice speak --event done` and no config exists
- **THEN** the user is told to run `agent-voice init`
- **AND** the process exits with a non-zero code

### Requirement: say command

The CLI SHALL provide `agent-voice say "<text>"` that speaks the provided text
directly using the platform speaker, independent of `messages`. It SHALL still
apply the configured voice settings when a config exists, but SHALL NOT require the
text to come from `messages`.

#### Scenario: Arbitrary text is spoken
- **WHEN** the user runs `agent-voice say "test text"`
- **THEN** exactly `test text` is spoken via the platform speaker

#### Scenario: Empty text is rejected
- **WHEN** the user runs `agent-voice say` with no text argument
- **THEN** an error is printed and the process exits with a non-zero code

### Requirement: install command

The CLI SHALL provide `agent-voice install --target <claude|codex>` that dispatches
to the corresponding hook installer. An unknown target SHALL print an error and
exit non-zero.

#### Scenario: claude target installs the Claude hook
- **WHEN** the user runs `agent-voice install --target claude`
- **THEN** the Claude hook installer runs

#### Scenario: codex target runs the Codex stub
- **WHEN** the user runs `agent-voice install --target codex`
- **THEN** the Codex hook installer runs and reports it is not fully implemented

#### Scenario: Unknown target exits non-zero
- **WHEN** the user runs `agent-voice install --target frobnicate`
- **THEN** an error naming the unknown target is printed
- **AND** the process exits with a non-zero code

### Requirement: Clear errors and exit codes

All commands SHALL print human-readable error messages to standard error and exit
with a non-zero status on failure, and exit zero on success.

#### Scenario: Failure path exits non-zero
- **WHEN** any command fails (e.g. speak with a missing config)
- **THEN** a clear message is written to standard error
- **AND** the process exit code is non-zero
