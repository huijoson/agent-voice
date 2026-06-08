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
 */
export function buildPlayerScript(filePath: string): string {
  const escaped = escapePowerShellSingleQuoted(filePath);
  return [
    "Add-Type -AssemblyName presentationCore;",
    "$player = New-Object System.Windows.Media.MediaPlayer;",
    `$player.Open([System.Uri]::new('${escaped}'));`,
    "$sw = [System.Diagnostics.Stopwatch]::StartNew();",
    "while (-not $player.NaturalDuration.HasTimeSpan -and $sw.Elapsed.TotalSeconds -lt 10) { Start-Sleep -Milliseconds 50 };",
    "$player.Play();",
    "if ($player.NaturalDuration.HasTimeSpan) { Start-Sleep -Seconds $player.NaturalDuration.TimeSpan.TotalSeconds } else { Start-Sleep -Seconds 5 };",
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
