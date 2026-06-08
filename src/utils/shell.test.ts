import { EventEmitter } from "node:events";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

import { spawn } from "node:child_process";
import { escapePowerShellSingleQuoted, defaultRunner } from "./shell.js";

describe("escapePowerShellSingleQuoted", () => {
  it("leaves plain text unchanged", () => {
    expect(escapePowerShellSingleQuoted("hello world")).toBe("hello world");
  });

  it("doubles a single quote", () => {
    expect(escapePowerShellSingleQuoted("it's")).toBe("it''s");
  });

  it("doubles every single quote in an injection payload", () => {
    const payload = "'; Remove-Item C:\\ -Recurse; '";
    const escaped = escapePowerShellSingleQuoted(payload);
    // Every apostrophe is doubled so that, inside a '...' literal, the string is
    // inert data and cannot terminate the literal to inject commands.
    expect(escaped).toBe("''; Remove-Item C:\\ -Recurse; ''");
    expect((escaped.match(/'/g) ?? []).length).toBe(
      (payload.match(/'/g) ?? []).length * 2,
    );
  });

  it("preserves $, backtick, double-quote and newlines literally", () => {
    const input = 'a $x `b` "c"\nsecond';
    // None of these are special inside a single-quoted PowerShell literal, so
    // they must pass through untouched.
    expect(escapePowerShellSingleQuoted(input)).toBe(input);
  });

  it("handles an empty string", () => {
    expect(escapePowerShellSingleQuoted("")).toBe("");
  });
});

describe("defaultRunner", () => {
  beforeEach(() => {
    vi.mocked(spawn).mockReset();
  });

  function fakeChild() {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    return child;
  }

  it("spawns with the command and argument array (no shell)", async () => {
    const child = fakeChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = defaultRunner("say", ["hello"]);
    child.emit("close", 0);
    await promise;

    expect(spawn).toHaveBeenCalledTimes(1);
    const call = vi.mocked(spawn).mock.calls[0];
    expect(call[0]).toBe("say");
    expect(call[1]).toEqual(["hello"]);
    // Must not run via a shell.
    expect((call[2] as { shell?: boolean } | undefined)?.shell).not.toBe(true);
  });

  it("resolves with collected stdout/stderr on exit 0", async () => {
    const child = fakeChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = defaultRunner("cmd", []);
    child.stdout.emit("data", Buffer.from("out"));
    child.stderr.emit("data", Buffer.from("err"));
    child.emit("close", 0);

    const result = await promise;
    expect(result).toEqual({ code: 0, stdout: "out", stderr: "err" });
  });

  it("rejects on a non-zero exit code", async () => {
    const child = fakeChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = defaultRunner("cmd", []);
    child.stderr.emit("data", Buffer.from("boom"));
    child.emit("close", 3);

    await expect(promise).rejects.toThrow(/3/);
  });

  it("rejects when the process fails to spawn", async () => {
    const child = fakeChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = defaultRunner("nope", []);
    child.emit("error", new Error("ENOENT"));

    await expect(promise).rejects.toThrow(/ENOENT/);
  });
});
