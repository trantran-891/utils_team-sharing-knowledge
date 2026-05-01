import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const topicRoot = path.resolve("data/generated/topic");

export function formatDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function descriptionMarkdown(topic) {
  return `# ${topic.title}

## Overview
${topic.overview}

## Background
${topic.background}

## Why this topic matters
${topic.whyItMatters}

## Target audience
${(topic.targetAudience || []).map((item) => `- ${item}`).join("\n")}

## Difficulty
${topic.difficulty}

## Expected impact
${topic.expectedImpact}

## Suggested agenda
1. Context and current team problem
2. Core concepts
3. Practical examples
4. Team discussion
`;
}

export async function saveGeneratedTopics(topics, dateKey = formatDateKey()) {
  const cycleDir = path.join(topicRoot, dateKey);
  await mkdir(cycleDir, { recursive: true });

  const storedTopics = [];
  for (const [index, topic] of topics.entries()) {
    const id = topic.id || `topic_${String(index + 1).padStart(2, "0")}`;
    const topicDir = path.join(cycleDir, id);
    const descriptionPath = path.join(topicDir, "description.md");
    await mkdir(topicDir, { recursive: true });
    const storedTopic = {
      ...topic,
      id,
      status: topic.status || "generated",
      voteCount: topic.voteCount || 0,
      descriptionPath: path.relative(process.cwd(), descriptionPath)
    };
    await writeFile(descriptionPath, descriptionMarkdown(storedTopic));
    storedTopics.push(storedTopic);
  }

  const index = {
    date: dateKey,
    cycleId: `${dateKey}-${Date.now()}`,
    status: "generated",
    createdAt: new Date().toISOString(),
    topics: storedTopics
  };
  await writeFile(path.join(cycleDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  await writeFile(path.join(topicRoot, "current.json"), `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

export async function readCurrentTopics() {
  try {
    return JSON.parse(await readFile(path.join(topicRoot, "current.json"), "utf8"));
  } catch {
    return { date: null, status: "empty", topics: [] };
  }
}

export async function writeCurrentTopics(index) {
  await mkdir(topicRoot, { recursive: true });
  if (index.date) {
    await mkdir(path.join(topicRoot, index.date), { recursive: true });
    await writeFile(path.join(topicRoot, index.date, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  }
  await writeFile(path.join(topicRoot, "current.json"), `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

export async function readTopicHistory() {
  await mkdir(topicRoot, { recursive: true });
  const entries = await readdir(topicRoot, { withFileTypes: true });
  const histories = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      histories.push(JSON.parse(await readFile(path.join(topicRoot, entry.name, "index.json"), "utf8")));
    } catch {
      // Ignore incomplete demo folders.
    }
  }
  return histories.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
