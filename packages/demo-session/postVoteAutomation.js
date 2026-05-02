import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runPostVoteScheduling({
  config,
  selectedTopics,
  rankedTopics,
  members,
  votes
}) {
  const payload = { config, selectedTopics, rankedTopics, members, votes };
  const payloadDir = path.resolve("data/demo-runtime");
  const payloadPath = path.join(payloadDir, `post-vote-${Date.now()}.json`);
  await mkdir(payloadDir, { recursive: true });
  await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`);

  const tsxBin = path.resolve("node_modules/.bin/tsx");
  const runnerPath = path.resolve("apps/demo/src/post-vote-runner.ts");
  const { stdout } = await execFileAsync(tsxBin, [runnerPath, payloadPath], {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024
  });

  return JSON.parse(stdout.trim());
}
