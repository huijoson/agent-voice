## ADDED Requirements

### Requirement: Default configuration

The system SHALL define a canonical default configuration used when initializing a
new config file. The default SHALL contain `engine: "system"`; a `voice` object
with `macos: null`, `windows: null`, `rate: 1`, `volume: 100`; a `messages` object
with `done`, `needInput`, `permission`, and `error` strings; and a `notification`
object with `enabled: false`.

#### Scenario: Default config is well-formed
- **WHEN** the default configuration is read
- **THEN** it exposes `engine`, `voice.{macos,windows,rate,volume}`,
  `messages.{done,needInput,permission,error}`, and `notification.enabled`
- **AND** every `messages` value is a non-empty string

### Requirement: OS-specific config path resolution

The system SHALL resolve the configuration file path to `<home>/.agent-voice/config.json`,
where `<home>` is the current user's home directory, on macOS, Linux, and Windows.

#### Scenario: Path resolves under the user home directory
- **WHEN** the config path is resolved
- **THEN** it ends with `.agent-voice/config.json` (using the platform path
  separator)
- **AND** its parent directory is `<home>/.agent-voice`

### Requirement: Initialize configuration

The `init` operation SHALL create the config directory if missing and write the
default configuration to `config.json`. If `config.json` already exists, it SHALL
NOT be overwritten unless overwrite is explicitly confirmed (via a prompt) or a
`force` flag is supplied.

#### Scenario: Fresh initialization creates directory and file
- **WHEN** `init` runs and no `.agent-voice` directory exists
- **THEN** the directory is created
- **AND** `config.json` is written with the default configuration

#### Scenario: Existing config is protected
- **WHEN** `init` runs and `config.json` already exists and overwrite is not
  confirmed
- **THEN** the existing file is left unchanged

#### Scenario: Force overwrites existing config
- **WHEN** `init` runs with `force: true` and `config.json` already exists
- **THEN** the file is overwritten with the default configuration

### Requirement: Load configuration with actionable errors

The system SHALL load and parse the config file. When the file does not exist it
SHALL raise an error instructing the user to run `agent-voice init`. When the file
exists but contains invalid JSON it SHALL raise a distinct, clear parse error.

#### Scenario: Missing config guides the user to init
- **WHEN** `loadConfig` runs and `config.json` does not exist
- **THEN** an error is raised whose message tells the user to run
  `agent-voice init`

#### Scenario: Invalid JSON produces a clear error
- **WHEN** `loadConfig` runs and `config.json` contains invalid JSON
- **THEN** an error is raised indicating the config file could not be parsed

#### Scenario: Valid config is returned
- **WHEN** `loadConfig` runs and `config.json` contains valid configuration
- **THEN** the parsed configuration object is returned

### Requirement: Save configuration

The system SHALL write a configuration object to `config.json` as human-readable
(pretty-printed) JSON, creating the config directory first if necessary.

#### Scenario: Saving writes readable JSON
- **WHEN** `saveConfig` is given a configuration object
- **THEN** `config.json` contains pretty-printed JSON that round-trips back to an
  equal object
