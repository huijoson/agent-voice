## Context

The audit covered all of `src/`. The codebase is already defensively written
(arguments passed to `spawn` as arrays, PowerShell single-quote escaping, a
non-destructive hook merge, JSON-shape config validation). The three issues here
are gaps in **input** handling — config values and OS-command construction — not
architectural flaws. Each is local to a single pure, already-unit-tested function,
which makes them well-suited to a TDD fix with no structural change.

## Goals / Non-Goals

**Goals:**
- Validate `voice` config fields so bad input fails at load, not as a downstream
  `NaN`/cryptic symptom.
- Make the macOS `say` invocation treat the message strictly as text.
- Make the Windows player surface unplayable files promptly.
- Keep all existing tests green and the CLI/config surface unchanged.

**Non-Goals:**
- Changing the config schema, message defaults, or any CLI command.
- Implementing the Codex hook (the LOW-risk item) — documented as a follow-up only.
- macOS `say` rate support (still a deferred v1 TODO).
- Reworking the Windows duration-probe approach beyond adding failure detection.

## Decisions

**1. Validate voice fields inside `assertValidConfig` (not a new layer).**
The existing `assertValidConfig` already accumulates a `problems[]` list and throws
one actionable error. Extending it keeps a single validation site and error format.
- `voice.rate`, `voice.volume`: require `typeof === "number" && Number.isFinite(v)`
  (rejects `NaN`, `Infinity`, strings, `null`).
- `voice.macos`, `voice.windows`: require `value === null || typeof === "string"`.
- *Alternative considered:* clamping/coercing bad values (e.g. `NaN → 1`) at the
  speaker. Rejected — it hides config mistakes and spreads validation across modules.

**2. Insert a `--` end-of-options marker in `buildSayArgs`.**
BSD `say` honours `--` to end option parsing, so the message after it is literal.
Place it in both branches: `["-v", voice, "--", text]` and `["--", text]`.
- *Alternative considered:* stripping/escaping a leading `-`. Rejected — it mutates
  the user's text; `--` is the canonical, lossless fix.
- *Verification note:* implementer must confirm `say -- "text"` on real macOS during
  the manual smoke test; the unit test only asserts arg order.

**3. Register a `MediaFailed` handler in the Windows player script.**
Open the media, subscribe to `MediaFailed` (set a flag / capture the error), then in
the existing probe loop also break on failure and throw an agent-voice-prefixed
error. Keeps the bounded 10 s probe as a backstop for the "never resolves" case.
- *Alternative considered:* shortening the timeout. Rejected — it does not detect
  genuine failures and would clip slow-to-open valid files.

## Risks / Trade-offs

- **Stricter config rejects previously-tolerated files** → Intended; error names the
  field and points to `agent-voice init`. Documented in the proposal Impact.
- **`MediaFailed` PowerShell wiring is only assertable as script text in unit tests**
  (the suite never produces audio) → Mitigate with a manual smoke test against a
  deliberately corrupt file, recorded in the result report.
- **`say --` behavior is assumed from BSD `say` docs** → Mitigate with the manual
  macOS smoke test before the PR is merged; the change is inert on Windows/Linux.
- **Number validation must not reject valid `0`** (`volume: 0` is legal) → use
  `Number.isFinite`, not truthiness.
