## MODIFIED Requirements

### Requirement: Codex hook installer

The system SHALL expose `installCodexHook()` behind a stable interface mirroring
the Claude installer's shape. It SHALL register agent-voice as Codex CLI's
notification program by setting the single top-level `notify` key in the Codex
config file (`~/.codex/config.toml`, TOML format; honoring `$CODEX_HOME` when
set) to `["agent-voice", "codex-notify"]`. The operation SHALL be
non-destructive, idempotent, and SHALL NOT overwrite a foreign `notify` value.
On success it SHALL return a result describing the config path, the backup path
(or null), and `created` / `changed` flags, and SHALL report `implemented: true`
so that `install --target codex` returns exit code `0`.

#### Scenario: Install into a config with no notify key

- **WHEN** `installCodexHook()` runs and `config.toml` has no `notify` key (or the file/dir does not exist)
- **THEN** the config dir and file are created if needed
- **AND** `notify` is set to `["agent-voice", "codex-notify"]`
- **AND** the result reports `changed: true` and `implemented: true`

#### Scenario: Re-running is idempotent

- **WHEN** `installCodexHook()` runs and `notify` is already `["agent-voice", "codex-notify"]`
- **THEN** the config file is not rewritten and no backup is created
- **AND** the result reports `changed: false`

#### Scenario: Foreign notify hook is left untouched

- **WHEN** `installCodexHook()` runs and `notify` is set to some other command
- **THEN** the existing `notify` value is preserved unchanged
- **AND** a warning is logged explaining how to add agent-voice manually
- **AND** the result reports `changed: false`

#### Scenario: Existing config is backed up before any write

- **WHEN** `installCodexHook()` makes a change to an existing config file
- **THEN** a byte-for-byte backup is written to `config.toml.bak-<timestamp>` before the new content is written
- **AND** the result's backup path points to that file

#### Scenario: Malformed config is not overwritten

- **WHEN** `installCodexHook()` runs and the existing `config.toml` is not valid TOML (or its top level is not a table)
- **THEN** it throws an error explaining the file must be fixed or moved first
- **AND** the original file is left unchanged

#### Scenario: Install command returns success

- **WHEN** `agent-voice install --target codex` runs and `installCodexHook()` resolves
- **THEN** the command exits with code `0`

## ADDED Requirements

### Requirement: Codex notify dispatcher

The system SHALL provide a hidden `agent-voice codex-notify` command that Codex
CLI invokes as its `notify` program. Codex appends the event payload as a JSON
string in the final command-line argument (there is no stdin). The dispatcher
SHALL read that final argument, parse it as JSON, and when the event `type` is
`agent-turn-complete` it SHALL speak the configured `done` message (the same
behavior as `speak --event done`). The dispatcher SHALL tolerate missing,
malformed, or unrecognized payloads without throwing back into Codex.

#### Scenario: Turn-complete event speaks the done message

- **WHEN** `agent-voice codex-notify` is invoked with a final argument of `{"type":"agent-turn-complete", ...}`
- **THEN** the configured `done` event message (or sound) is played
- **AND** the command exits with code `0`

#### Scenario: Unknown event type is ignored

- **WHEN** `agent-voice codex-notify` is invoked with a payload whose `type` is not `agent-turn-complete`
- **THEN** nothing is spoken
- **AND** the command exits with code `0`

#### Scenario: Malformed or missing payload does not break Codex

- **WHEN** `agent-voice codex-notify` is invoked with no final argument, or with an argument that is not valid JSON
- **THEN** nothing is spoken
- **AND** the command exits with code `0` (it never throws back into Codex)

#### Scenario: Partial payload with extra or missing fields is tolerated

- **WHEN** `agent-voice codex-notify` receives an `agent-turn-complete` payload missing optional fields (e.g. no `last-assistant-message`) or containing unknown extra fields
- **THEN** it still speaks the configured `done` message without error
