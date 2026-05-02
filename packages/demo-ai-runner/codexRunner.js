import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runCodexPrompt(prompt) {
  try {
    const { stdout } = await execFileAsync("codex", ["exec", prompt], {
      timeout: 120_000,
      maxBuffer: 1024 * 1024 * 10
    });
    return stdout;
  } catch {
    return null;
  }
}
