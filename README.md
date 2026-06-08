# agent-voice

A tiny, cross-platform (macOS + Windows) command-line tool that **speaks
customizable prompts** so AI coding agents — Claude Code, Codex CLI, and others —
can notify you by voice when they:

- ✅ **finish** a task (`done`)
- ⌨️ **need your input** (`needInput`)
- 🔐 **need authorization** (`permission`)
- ❌ **hit an error** (`error`)

v1 is intentionally small: **system TTS only** (macOS `say`, Windows
`System.Speech`), no cloud services, no API keys, no GUI.

---

## 1. What it's for

When an agent runs a long task you usually look away. Visual-only notifications in
a background terminal are easy to miss. `agent-voice` lets the agent's hook system
run a single command that reads a short, user-defined sentence out loud, pulling
your attention back exactly when it's needed.

## 2. Installation

Requires **Node.js ≥ 18**.

```bash
# from a clone of this repo
npm install
npm run build
npm link        # exposes the `agent-voice` command globally (optional)
```

Or run it without linking via `node dist/index.js <command>` after building, or
`npm run dev -- <command>` during development.

## 3. Build

```bash
npm run build       # compiles TypeScript from src/ to dist/
npm run typecheck   # type-check only, no emit
```

The published binary is `dist/index.js` (exposed as `agent-voice` via the
`bin` field in `package.json`).

## 4. Local development

```bash
npm run dev -- say "hello"   # run the CLI from source with tsx (no build step)
npm test                     # run the Vitest suite once
npm run test:watch           # watch mode
npm run coverage             # tests + coverage report
```

The test suite never produces audio and runs on macOS, Windows, and Linux CI:
speaker tests inject a fake command runner, config/hook tests use temp
directories, and the PowerShell escaping helper is unit-tested directly.

## 5. Initialize the config file

```bash
agent-voice init
```

This creates:

- macOS / Linux: `~/.agent-voice/config.json`
- Windows: `%USERPROFILE%\.agent-voice\config.json`

If the file already exists you'll be asked before it is overwritten. Default
contents:

```json
{
  "engine": "system",
  "voice": {
    "macos": null,
    "windows": null,
    "rate": 1,
    "volume": 100
  },
  "messages": {
    "done": "任務完成了，請回來確認結果。",
    "needInput": "目前需要你的回覆，請回來看一下。",
    "permission": "需要你的授權，請回來確認。",
    "error": "執行發生錯誤，請檢查終端機。"
  },
  "notification": {
    "enabled": false
  }
}
```

Edit the `messages` to taste. Set `voice.macos` / `voice.windows` to a specific
installed voice name (otherwise the system default is used).

## 6. Test the speech

Speak a configured event message:

```bash
agent-voice speak --event done
agent-voice speak --event needInput
agent-voice speak --event permission
agent-voice speak --event error
```

Speak arbitrary text directly (does not use `messages`):

```bash
agent-voice say "這是一段測試文字"
```

## 7. Install the Claude Code hook

```bash
agent-voice install --target claude
```

This edits your Claude Code settings file (default `~/.claude/settings.json`):

- **Backs it up first** to `settings.json.bak-YYYYMMDDHHmmss` in the same folder.
- **Merges** two hooks without removing anything you already have:
  - `Stop` → `agent-voice speak --event done`
  - `Notification` → `agent-voice speak --event needInput`
- Running it again is **idempotent** (no duplicate entries).

> **Note on the settings location/shape:** Claude Code's settings path and hook
> schema can vary between versions. agent-voice assumes `~/.claude/settings.json`
> and the documented `hooks.<Event> = [{ hooks: [{ type: "command", command }] }]`
> shape, takes a timestamped backup before writing, and never deletes existing
> keys. If your version differs, restore the `.bak-*` file and adjust manually.

### Codex CLI hook (preview)

```bash
agent-voice install --target codex
```

Prints **"Codex hook install is not fully implemented yet"** — the installer
interface is in place (`src/hooks/codex.ts`) and reserved for a future release.

## 8. Platform notes & limitations

| | macOS | Windows |
|---|---|---|
| Engine | built-in `say` | `System.Speech.Synthesis.SpeechSynthesizer` (PowerShell) |
| Voice | `voice.macos` → `say -v <voice>` | `voice.windows` → `SelectVoice` |
| Volume | system volume | `voice.volume` (0–100) |
| Rate | **not implemented in v1 (TODO)** | `voice.rate` mapped to SAPI rate (−10…10) |

- **Linux / other platforms:** not supported in v1 — the CLI fails with a clear
  message rather than trying to guess an engine.
- **Windows PowerShell:** uses `powershell` (present on all supported Windows). The
  message text is embedded as data, never executed.
- `rate` is best-effort and differs per OS, so the same value won't sound
  identical on both platforms.

## 9. Security

User-customizable message text is treated strictly as **data**, never as shell or
script code:

- **macOS:** text is passed as a discrete argument to `spawn("say", [...])`. No
  shell is invoked, so quotes and metacharacters are inert.
- **Windows:** text is embedded inside a PowerShell **single-quoted** string
  literal via the dedicated `escapePowerShellSingleQuoted()` helper, which doubles
  every `'` (the only special character inside a single-quoted literal). PowerShell
  is launched via `spawn` with an argument array, not a concatenated command line.
- Injection payloads (e.g. `'; Remove-Item C:\ -Recurse; '`) are covered by unit
  tests and remain inert data.
- `install --target claude` always backs up your settings before modifying them
  and never removes existing configuration.

## 10. Roadmap

- [ ] Full **Codex CLI** hook support
- [ ] **Edge TTS** engine
- [ ] **OpenAI TTS** engine
- [ ] **Tauri GUI** for configuration
- [ ] **Per-event voices** (a different voice per event)
- [ ] Optional **system desktop notifications** (the reserved `notification` flag)

## License

MIT
