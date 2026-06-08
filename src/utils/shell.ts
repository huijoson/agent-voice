import { spawn } from "node:child_process";
import type { CommandRunner } from "../types.js";

/**
 * Escape arbitrary text for safe inclusion inside a PowerShell **single-quoted**
 * string literal.
 *
 * Inside a single-quoted PowerShell string the ONLY special character is the
 * single quote itself, which is escaped by doubling it. Every other character —
 * including `$`, backtick, double quotes, and newlines — is treated literally.
 * Doubling the quotes guarantees user-supplied text can never terminate the
 * literal and inject executable PowerShell.
 *
 * The caller is responsible for wrapping the result in single quotes, e.g.
 * `'${escapePowerShellSingleQuoted(text)}'`.
 */
export function escapePowerShellSingleQuoted(text: string): string {
  return text.replace(/'/g, "''");
}

/**
 * Default {@link CommandRunner}: runs a command with an argument array via
 * `spawn` (never a shell). Resolves with the collected output on exit code 0,
 * rejects on a non-zero exit code or a spawn error. Audio commands inherit no
 * shell, so argument values are passed verbatim and cannot be re-interpreted.
 */
export const defaultRunner: CommandRunner = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      const exitCode = code ?? 0;
      if (exitCode === 0) {
        resolve({ code: exitCode, stdout, stderr });
      } else {
        reject(
          new Error(
            `Command failed (exit ${exitCode}): ${command} ${args.join(" ")}\n${stderr}`.trim(),
          ),
        );
      }
    });
  });
