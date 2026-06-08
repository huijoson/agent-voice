# agent-voice — Build Workflow Design (2026-06-08)

## Summary

Greenfield cross-platform TypeScript CLI `agent-voice` that speaks user-customized
prompts so AI coding agents can notify the developer by voice on key events
(`done`, `needInput`, `permission`, `error`). v1 is system-TTS only (macOS `say`,
Windows `System.Speech`), no cloud, no GUI.

The authoritative product spec is the OpenSpec change
`openspec/changes/add-agent-voice-cli/` (proposal, design, 5 capability specs,
tasks). This document records the *process* and the locked decisions.

## Locked decisions

| Decision | Choice |
| --- | --- |
| Project location | Repository root `C:\coding\tts-alarm` (package name `agent-voice`) |
| Codex role | Independent adversarial reviewer (`codex review` / `codex exec`); Claude triages |
| Test framework | Vitest + `@vitest/coverage-v8`, scripts `test`/`test:watch`/`coverage` |
| Methodology | Test-first / TDD (superpowers) |

### Test strategy (user-specified)
1. Test pure logic first; never invoke real OS TTS in tests.
2. Mock `child_process.spawn` for speaker tests.
3. Config tests use temp dirs, never the real `~/.agent-voice`.
4. Hook tests use fixture `settings.json` and assert existing hooks survive merge.
5. The shell-escape helper has dedicated unit tests (incl. injection payloads).
6. Integration tests cover `init` / `speak` core flows.
7. Suite runs on macOS, Windows, and Linux CI; no test depends on real audio.

## Workflow phases

- **Phase 0 — Bootstrap:** `git init`, `openspec init --tools claude,codex`,
  scaffold `package.json` / `tsconfig.json` / `vitest.config.ts` / `.gitignore`.
- **Phase 1 — OpenSpec spec (規格計劃書):** change `add-agent-voice-cli` with
  proposal, design, capability specs, and a TDD-ordered `tasks.md`;
  `openspec validate --strict`.
- **Gate A:** user reviews the OpenSpec spec before any app code is written.
- **Phase 2 — TDD implementation:** per `tasks.md`, RED → GREEN → REFACTOR with
  Vitest. Foundation (types, platform, shell-escape, paths) sequential; then
  fan-out (config, speakers, hooks) — optionally via parallel subagents.
- **Phase 3 — Independent review:** `codex review` / `codex exec` plus a
  superpowers code-review pass, run concurrently; Claude triages and fixes real
  findings with tests.
- **Phase 4 — Verify & finish:** full green test + coverage, `openspec validate`,
  README + manual-smoke doc, final commit and summary.
- **Gate B:** final report; `openspec archive` only on user confirmation.

## Capabilities (OpenSpec specs)

1. `config-management` — default config, OS path resolution, init/load/save.
2. `tts-speaker` — platform selection, macOS/Windows/unsupported speakers, safe
   escaping.
3. `cli-commands` — `init` / `speak` / `say` / `install` surface, errors, exit codes.
4. `claude-hook-install` — locate, back up, non-destructive idempotent merge.
5. `codex-hook-install` — stub interface + placeholder.

## Source of truth

- Product requirements: `openspec/changes/add-agent-voice-cli/`
- Process & decisions: this file.
