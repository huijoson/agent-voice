import type { CommandRunner, Player } from "../types.js";
import { defaultRunner, escapePowerShellSingleQuoted } from "../utils/shell.js";

/**
 * Build the PowerShell script that plays an audio file via the WPF
 * `System.Windows.Media.MediaPlayer`, which decodes `.m4a` (and other formats)
 * through Windows Media Foundation — unlike `System.Media.SoundPlayer`, which is
 * WAV-only.
 *
 * The file path is escaped with {@link escapePowerShellSingleQuoted} and wrapped
 * in a single-quoted literal so it can never terminate the string or inject
 * PowerShell. `MediaPlayer.Open` is asynchronous, so the script waits (bounded)
 * for the media's duration to become known, plays, then sleeps for the clip
 * length before closing. MediaPlayer requires an STA thread; the player is run
 * via `powershell` (Windows PowerShell), which is STA by default, and we also
 * pass `-STA` explicitly.
 *
 * Two correctness details:
 *  - We sleep in MILLISECONDS (`TotalMilliseconds` + a small buffer), not whole
 *    seconds. In Windows PowerShell 5.1 `Start-Sleep -Seconds` is `Int32`, so a
 *    fractional duration would be truncated and a sub-second cue could be cut
 *    off entirely.
 *  - If the duration never becomes known (e.g. the file exists but is not a
 *    playable audio format, so `MediaFailed` would fire), we throw so the runner
 *    rejects with a non-zero exit instead of pretending to succeed silently.
 *
 * NOTE: `[System.Uri]::new(path)` preserves `%XX` literally on .NET Framework
 * (Windows PowerShell). On PowerShell 7 (`pwsh`/.NET) it would percent-decode —
 * keep using `powershell` if paths may contain `%`.
 */
export function buildPlayerScript(filePath: string): string {
  const escaped = escapePowerShellSingleQuoted(filePath);
  return [
    "Add-Type -AssemblyName presentationCore;",
    "$player = New-Object System.Windows.Media.MediaPlayer;",
    `$player.Open([System.Uri]::new('${escaped}'));`,
    "$sw = [System.Diagnostics.Stopwatch]::StartNew();",
    "while (-not $player.NaturalDuration.HasTimeSpan -and $sw.Elapsed.TotalSeconds -lt 10) { Start-Sleep -Milliseconds 50 };",
    "if (-not $player.NaturalDuration.HasTimeSpan) { $player.Close(); throw 'agent-voice: could not load audio (unknown duration); the file may not be a playable format.' };",
    "$player.Play();",
    "Start-Sleep -Milliseconds ([int]$player.NaturalDuration.TimeSpan.TotalMilliseconds + 300);",
    "$player.Stop();",
    "$player.Close();",
  ].join(" ");
}

/** Wrap a PowerShell script in the flags used to run it non-interactively (STA). */
export function buildPowerShellArgs(script: string): string[] {
  return ["-NoProfile", "-NonInteractive", "-STA", "-Command", script];
}

/**
 * Create a {@link Player} backed by the Windows WPF MediaPlayer driven through
 * PowerShell. The runner is injectable so tests can record invocations without
 * producing audio. A runner rejection propagates to the caller.
 */
export function createWindowsPlayer(
  runner: CommandRunner = defaultRunner,
): Player {
  return {
    async play(filePath: string): Promise<void> {
      const script = buildPlayerScript(filePath);
      await runner("powershell", buildPowerShellArgs(script));
    },
  };
}
