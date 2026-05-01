import { runCodexPrompt } from "./codexRunner.js";
import { runMockTopicPrompt } from "./mockAiRunner.js";
import { buildTopicPrompt } from "./prompts.js";

export async function generateTopicsWithAi(context) {
  if (process.env.USE_CODEX_CLI !== "true") {
    return runMockTopicPrompt(context);
  }

  const prompt = buildTopicPrompt(context);
  const raw = await runCodexPrompt(prompt);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((topic, index) => ({
          id: `topic_${String(index + 1).padStart(2, "0")}`,
          title: topic.title,
          overview: topic.overview,
          background: topic.background,
          whyItMatters: topic.whyItMatters,
          difficulty: topic.difficulty || "Intermediate",
          expectedImpact: topic.expectedImpact || "Medium",
          targetAudience: context.members.map((member) => member.role),
          status: "generated",
          voteCount: 0
        }));
      }
    } catch {
      // Fall through to mock data. Demo stability is more important than CLI availability.
    }
  }

  return runMockTopicPrompt(context);
}
