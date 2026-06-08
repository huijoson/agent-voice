import type { CommandRunner, Speaker, VoiceConfig } from "../types.js";
import { defaultRunner, escapePowerShellSingleQuoted } from "../utils/shell.js";

/** Clamp `value` into the inclusive range [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Map a best-effort rate multiplier (1 = normal) to the SAPI rate scale.
 *
 * SAPI exposes `SpeechSynthesizer.Rate` as an integer in [-10, 10] where 0 is
 * normal. A 1x multiplier maps to 0, 2x to +10, and 0.5x to -5. Results are
 * rounded to the nearest integer and clamped to the valid range.
 */
export function mapRateToSapi(rate: number): number {
  return clamp(Math.round((rate - 1) * 10), -10, 10);
}

/**
 * Clamp a volume to the SAPI `SpeechSynthesizer.Volume` range [0, 100] as an
 * integer.
 */
export function clampVolume(volume: number): number {
  return clamp(Math.round(volume), 0, 100);
}

/**
 * Build the PowerShell script that speaks `text` via the System.Speech SAPI
 * synthesizer.
 *
 * Both the spoken text and the voice name are escaped with
 * {@link escapePowerShellSingleQuoted} and wrapped in single quotes so that no
 * user input can terminate the literal and inject executable PowerShell.
 * Numeric settings are injected as bare numeric literals.
 */
export function buildPowerShellScript(text: string, voice: VoiceConfig): string {
  const rate = mapRateToSapi(voice.rate);
  const volume = clampVolume(voice.volume);
  const escapedText = escapePowerShellSingleQuoted(text);

  const lines = [
    "Add-Type -AssemblyName System.Speech;",
    "$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;",
    `$speak.Rate = ${rate};`,
    `$speak.Volume = ${volume};`,
  ];

  if (voice.windows) {
    const escapedVoice = escapePowerShellSingleQuoted(voice.windows);
    lines.push(`$speak.SelectVoice('${escapedVoice}');`);
  }

  lines.push(`$speak.Speak('${escapedText}');`);

  return lines.join(" ");
}

/** Wrap a PowerShell script in the flags used to run it non-interactively. */
export function buildPowerShellArgs(script: string): string[] {
  return ["-NoProfile", "-NonInteractive", "-Command", script];
}

/**
 * Create a {@link Speaker} backed by the Windows SAPI synthesizer driven through
 * PowerShell.
 *
 * The runner is injectable so tests can record invocations without producing
 * audio. A runner rejection propagates to the caller.
 */
export function createWindowsSpeaker(runner: CommandRunner = defaultRunner): Speaker {
  return {
    async speak(text: string, voice: VoiceConfig): Promise<void> {
      const script = buildPowerShellScript(text, voice);
      await runner("powershell", buildPowerShellArgs(script));
    },
  };
}
