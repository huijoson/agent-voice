# Result Report — Bug-Risk Hardening (`harden-bug-risks`)

**Date:** 2026-06-08
**Branch:** `harden-bug-risks`
**Spec:** `openspec/changes/harden-bug-risks/`
**Method:** OpenSpec change (proposal/design/specs/tasks) → TDD (red→green) → verification.

## 1. Scope

A bug-risk audit of `src/` (the whole codebase). The code is already defensively
written (array-arg `spawn`, PowerShell single-quote escaping, non-destructive hook
merge, JSON-shape config validation), so the audit targeted **input-handling
gaps** rather than structural flaws. Per the agreed plan, **HIGH + MEDIUM** risks
were fixed; LOW was documented as a follow-up.

## 2. Risks found & disposition

| # | Location | Risk | Severity | Action |
|---|----------|------|----------|--------|
| A | `config.ts` `assertValidConfig` | `voice.rate`/`voice.volume` not validated as numbers; `voice.macos`/`voice.windows` not validated as `string\|null`. A non-numeric rate flows through `mapRateToSapi` as `NaN` → `$speak.Rate = NaN;` → invalid PowerShell → **speech silently dies**. | HIGH | **Fixed** |
| B | `speaker/macos.ts` `buildSayArgs` | A message that *starts with* `-` is parsed by `say` as a flag instead of spoken. | MEDIUM | **Fixed** |
| C | `player/windows.ts` `buildPlayerScript` | A corrupt / non-audio file made the player spin for the full **10 s** duration-probe timeout before failing. | MEDIUM | **Fixed** |
| D | `cli.ts` `runInstall` (codex) | Reports success (`exit 0`) although `installCodexHook` returns `{ implemented: false }`. | LOW | **Deferred** (task 5.1) |

## 3. Fixes

**A — Config voice validation.** Extended `assertValidConfig` to require
`Number.isFinite` for `voice.rate`/`voice.volume` (so `0` is valid but `"fast"`,
`null`, `NaN` are not) and `string|null` for the voice names, reusing the existing
`problems[]` accumulator and actionable error format.

**B — macOS `say` end-of-options marker.** `buildSayArgs` now inserts `--` before
the text in both branches: `["-v", voice, "--", text]` / `["--", text]`. A
dash-leading message is spoken literally.

**C — Windows player fail-fast.** *Two iterations:*
1. First attempt added a `MediaFailed` handler that set a `$failed` flag polled by
   the `Start-Sleep` loop. **Unit tests passed, but a real Windows smoke test
   proved it ineffective** — the corrupt file still took **~10.9 s** and threw the
   *unknown-duration* (timeout) error, never the failure branch. Root cause: WPF
   delivers `MediaFailed` only while a dispatcher message pump runs; a bare
   `Start-Sleep` never pumps, so the event was never delivered.
2. Corrected to the canonical WPF async-wait: a `DispatcherFrame` + `PushFrame`
   message pump, stopped by `MediaOpened`, `MediaFailed`, or a 10 s
   `DispatcherTimer` backstop. Re-tested: the same corrupt file now fails in
   **~1.3 s** with the attributable *media failed to load* error.

   *Lesson:* asserting on generated script **text** can pass while the runtime
   behavior is unchanged — the manual smoke test is what caught it.

## 4. Verification

| Check | Result |
|-------|--------|
| `npm test` | **124 passed** (15 files); was 115 before — **+9** new tests (3 risks) |
| `npm run typecheck` | clean (no errors) |
| `npm run build` | clean |
| Windows fail-fast smoke (corrupt `.m4a`) | **~1.3 s**, `exit 1`, "media failed to load" (was ~10.9 s) |

## 5. Limitations (honest)

- **macOS `say --`** could not be exercised (no macOS here). The unit test asserts
  arg order; the design notes a macOS smoke test (`say -- "-test"`) before merge.
- **Valid-file audible playback on Windows** could not be confirmed in this
  **non-interactive session**: it has 6 healthy audio devices, but the headless
  process cannot reach the audio **render endpoint**, so even `C:\Windows\Media\
  ding.wav` raises `MediaFailed` (HRESULT `0xC00D11BA`). This is environmental, not
  a code defect — and it incidentally re-confirms the fail-fast path. The happy
  path is covered by unit tests plus the standard `MediaOpened` pattern and should
  be re-checked on an interactive desktop session.

## 6. Follow-ups

- **Risk D (task 5.1):** decide whether `runInstall` should return a non-zero or
  distinct "preview" exit code for the Codex target until it is implemented.
- Re-run the macOS and interactive-Windows manual smoke tests before release.
