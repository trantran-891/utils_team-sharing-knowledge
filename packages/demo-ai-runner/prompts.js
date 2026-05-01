export function buildTopicPrompt({ settings, members }) {
  return `Generate ${settings.topicsPerCycle} JSON topic ideas for a team sharing session.
Return only a JSON array. Each item needs title, overview, background, whyItMatters, difficulty, expectedImpact.
Direction: ${settings.topicDirection}
Members: ${JSON.stringify(members)}`;
}
