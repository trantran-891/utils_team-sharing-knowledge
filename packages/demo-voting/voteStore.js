import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readCurrentTopics, writeCurrentTopics } from "../demo-topic-generator/topicStore.js";

const votesPath = path.resolve("data/votes.json");

async function ensureVotes() {
  await mkdir(path.dirname(votesPath), { recursive: true });
  try {
    await readFile(votesPath, "utf8");
  } catch {
    await writeFile(votesPath, "[]\n");
  }
}

export async function readVotes() {
  await ensureVotes();
  return JSON.parse(await readFile(votesPath, "utf8"));
}

export async function writeVotes(votes) {
  await mkdir(path.dirname(votesPath), { recursive: true });
  await writeFile(votesPath, `${JSON.stringify(votes, null, 2)}\n`);
  return votes;
}

export async function submitVote(vote) {
  const votes = await readVotes();
  const current = await readCurrentTopics();
  const normalized = {
    userId: vote.userId,
    topicId: vote.topicId,
    reason: vote.reason || "No reason provided",
    createdAt: new Date().toISOString()
  };

  const withoutPrevious = votes.filter(
    (item) => !(item.userId === normalized.userId && current.topics.some((topic) => topic.id === item.topicId))
  );
  withoutPrevious.push(normalized);
  await writeVotes(withoutPrevious);
  await updateTopicVoteCounts(withoutPrevious);
  return normalized;
}

export async function updateTopicVoteCounts(votes = null) {
  const currentVotes = votes || await readVotes();
  const current = await readCurrentTopics();
  const counts = Object.fromEntries(current.topics.map((topic) => [topic.id, 0]));
  for (const vote of currentVotes) {
    if (counts[vote.topicId] !== undefined) counts[vote.topicId] += 1;
  }
  current.topics = current.topics.map((topic) => ({ ...topic, voteCount: counts[topic.id] || 0 }));
  return writeCurrentTopics(current);
}
