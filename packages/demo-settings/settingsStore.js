import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const settingsPath = path.resolve("configs/system-settings.json");

export const defaultSettings = {
  generateTopicDay: "Monday",
  notifyDay: "Wednesday",
  voteDeadlineDay: "Thursday",
  sharingDay: "Friday",
  topicDirection:
    "Focus on foundational knowledge, practical engineering skills, and cross-functional collaboration.",
  topicsPerCycle: 6
};

async function ensureParent(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export async function readSettings() {
  try {
    return JSON.parse(await readFile(settingsPath, "utf8"));
  } catch {
    await writeSettings(defaultSettings);
    return defaultSettings;
  }
}

export async function writeSettings(settings) {
  const normalized = { ...defaultSettings, ...settings };
  await ensureParent(settingsPath);
  await writeFile(settingsPath, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}
