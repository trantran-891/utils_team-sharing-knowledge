import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readVotes } from "../demo-voting/voteStore.js";
import { readCurrentTopics, writeCurrentTopics } from "../demo-topic-generator/topicStore.js";

const sessionsPath = path.resolve("data/sessions.json");

async function ensureSessions() {
  await mkdir(path.dirname(sessionsPath), { recursive: true });
  try {
    await readFile(sessionsPath, "utf8");
  } catch {
    await writeFile(sessionsPath, "[]\n");
  }
}

export async function readSessions() {
  await ensureSessions();
  return JSON.parse(await readFile(sessionsPath, "utf8"));
}

function finalDocumentMarkdown(topic, rank) {
  return `# ${topic.title}

## Demo document
This markdown document is generated after voting. Slide generation is intentionally out of scope for the demo.

## Priority
${rank}

## Overview
${topic.overview}

## Why this topic was selected
Vote count: ${topic.voteCount || 0}

## Next development scope
- Generate slide outline
- Generate speaker notes
- Export to PPTX
- Send calendar invite
`;
}

function voteSummaryMarkdown(topic, votes) {
  const topicVotes = votes.filter((vote) => vote.topicId === topic.id);
  return `# Vote Summary: ${topic.title}

Total votes: ${topicVotes.length}

${topicVotes.map((vote) => `- ${vote.userId}: ${vote.reason}`).join("\n") || "No votes recorded."}
`;
}

export async function generateFinalDocuments(metadata = {}) {
  const current = await readCurrentTopics();
  const votes = await readVotes();
  const selectedTopics = current.selectedTopics?.length
    ? current.selectedTopics
    : [...current.topics].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0)).slice(0, 1);

  const documentedTopics = [];
  for (const [index, topic] of selectedTopics.entries()) {
    const topicDir = path.dirname(path.resolve(topic.descriptionPath));
    const finalPath = path.join(topicDir, "final_document.md");
    const summaryPath = path.join(topicDir, "vote_summary.md");
    await writeFile(finalPath, finalDocumentMarkdown(topic, index + 1));
    await writeFile(summaryPath, voteSummaryMarkdown(topic, votes));
    documentedTopics.push({
      ...topic,
      status: "documented",
      selectedRank: index + 1,
      documentPath: path.relative(process.cwd(), finalPath),
      voteSummaryPath: path.relative(process.cwd(), summaryPath)
    });
  }

  const session = {
    id: `session_${current.cycleId || current.date || Date.now()}`,
    date: current.date,
    cycleId: current.cycleId,
    status: "documented",
    selectedTopics: documentedTopics,
    createdAt: new Date().toISOString(),
    ...metadata
  };
  const sessions = await readSessions();
  const withoutCurrent = sessions.filter((item) => item.id !== session.id);
  withoutCurrent.push(session);
  await writeFile(sessionsPath, `${JSON.stringify(withoutCurrent, null, 2)}\n`);

  await writeCurrentTopics({
    ...current,
    status: "documented",
    selectedTopics: documentedTopics
  });
  return session;
}

export async function completeSession() {
  const sessions = await readSessions();
  const latest = sessions.at(-1);
  if (!latest) return null;
  latest.status = "completed";
  latest.completedAt = new Date().toISOString();
  await writeFile(sessionsPath, `${JSON.stringify(sessions, null, 2)}\n`);

  const current = await readCurrentTopics();
  await writeCurrentTopics({ ...current, status: "completed" });
  return latest;
}

export async function attachSessionDraft(sessionId, sessionDraft) {
  const sessions = await readSessions();
  const index = sessions.findIndex((item) => item.id === sessionId);
  if (index < 0) return null;
  sessions[index] = {
    ...sessions[index],
    status: "scheduled",
    sessionDraft,
    scheduledAt: new Date().toISOString()
  };
  await writeFile(sessionsPath, `${JSON.stringify(sessions, null, 2)}\n`);
  return sessions[index];
}
