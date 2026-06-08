## ADDED Requirements

### Requirement: Codex hook installer stub

The system SHALL expose `installCodexHook()` behind a stable interface mirroring
the Claude installer's shape, so it can be wired into `install --target codex`
today and expanded later. In v1 it SHALL report that the feature is not yet fully
implemented and SHALL complete without throwing.

#### Scenario: Codex install reports not-yet-implemented
- **WHEN** `installCodexHook()` runs
- **THEN** it prints a message containing
  `Codex hook install is not fully implemented yet`
- **AND** it returns without throwing

#### Scenario: Interface is reserved for expansion
- **WHEN** the codebase is inspected
- **THEN** `hooks/codex.ts` exists and exports `installCodexHook`
- **AND** it documents (via TODO) the intended future behaviour
