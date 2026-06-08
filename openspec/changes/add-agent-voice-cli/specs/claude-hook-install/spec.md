## ADDED Requirements

### Requirement: Locate the Claude Code settings file

The installer SHALL target the Claude Code settings file at
`<home>/.claude/settings.json`. If the file does not exist it SHALL be created
(along with its parent directory) starting from an empty settings object.

#### Scenario: Settings path is resolved under home
- **WHEN** the Claude hook installer resolves its target
- **THEN** the target path is `<home>/.claude/settings.json`

#### Scenario: Missing settings file is created
- **WHEN** the installer runs and `settings.json` does not exist
- **THEN** a new `settings.json` is created containing the agent-voice hooks

### Requirement: Back up settings before modification

Before writing changes, the installer SHALL copy the existing settings file to a
timestamped backup named `settings.json.bak-YYYYMMDDHHmmss` in the same directory.

#### Scenario: Existing settings are backed up
- **WHEN** the installer runs and `settings.json` already exists
- **THEN** a backup file matching `settings.json.bak-YYYYMMDDHHmmss` is created
  with the original contents before any modification

### Requirement: Non-destructive hook merge

The installer SHALL merge two hooks without deleting or overwriting unrelated
settings or existing hooks: `Stop` SHALL run `agent-voice speak --event done`, and
`Notification` SHALL run `agent-voice speak --event needInput`. Existing entries
under `hooks.Stop` and `hooks.Notification` (and all other settings keys) SHALL be
preserved.

#### Scenario: Existing unrelated settings survive
- **WHEN** the installer merges into a settings file that contains other keys and
  other hooks
- **THEN** all pre-existing keys and hook entries remain present
- **AND** the agent-voice `Stop` and `Notification` entries are added

#### Scenario: Stop and Notification commands are correct
- **WHEN** the installer completes
- **THEN** `hooks.Stop` includes an entry running `agent-voice speak --event done`
- **AND** `hooks.Notification` includes an entry running
  `agent-voice speak --event needInput`

### Requirement: Idempotent installation

Running the installer more than once SHALL NOT create duplicate agent-voice hook
entries.

#### Scenario: Re-running does not duplicate entries
- **WHEN** the installer runs a second time on settings that already contain the
  agent-voice hooks
- **THEN** the agent-voice `Stop` and `Notification` entries each appear exactly
  once
