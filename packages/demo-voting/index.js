import { readCurrentTopics, writeCurrentTopics } from "../demo-topic-generator/topicStore.js";
import { readVotes, submitVote, updateTopicVoteCounts } from "./voteStore.js";

export async function getCurrentVoteState() {
  const [current, votes] = await Promise.all([readCurrentTopics(), readVotes()]);
  const relevantTopicIds = new Set(current.topics.map((topic) => topic.id));
  const currentVotes = votes.filter((vote) => relevantTopicIds.has(vote.topicId));
  return { ...current, votes: currentVotes };
}

export async function createVote(vote) {
  const saved = await submitVote(vote);
  const state = await getCurrentVoteState();
  return { saved, state };
}

export async function closeVoting() {
  await updateTopicVoteCounts();
  const current = await readCurrentTopics();
  const rankedTopics = [...current.topics].sort((a, b) => {
    if ((b.voteCount || 0) !== (a.voteCount || 0)) return (b.voteCount || 0) - (a.voteCount || 0);
    return a.id.localeCompare(b.id);
  });
  const selectedTopics = rankedTopics.filter((topic) => (topic.voteCount || 0) > 0);
  const selected = selectedTopics.length > 0 ? selectedTopics : rankedTopics.slice(0, 1);
  const updated = {
    ...current,
    status: "voting_closed",
    closedAt: new Date().toISOString(),
    rankedTopics,
    selectedTopics: selected.map((topic, index) => ({
      ...topic,
      status: "selected",
      selectedRank: index + 1
    }))
  };
  await writeCurrentTopics(updated);
  return updated;
}
