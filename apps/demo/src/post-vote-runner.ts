import { readFile } from "node:fs/promises";
import { createProviderRegistry } from "../../orchestrator/src/index.js";
import { moduleExecutionContextSchema, type ModuleExecutionContext, type ProviderKind, type RankedTopicList, type SessionDraft, type TopicSelectionResult, type VoteRecord } from "@tsa/schemas";

type DemoMember = {
  id: string;
  name: string;
  email?: string;
  role: string;
};

type DemoTopic = {
  id: string;
  title: string;
  overview: string;
  background?: string;
  whyItMatters?: string;
  difficulty?: string;
  expectedImpact?: string;
  targetAudience?: string[];
  voteCount?: number;
};

type DemoVote = {
  userId: string;
  topicId: string;
  reason?: string;
};

type DemoPayload = {
  config: Record<string, unknown>;
  selectedTopics: DemoTopic[];
  rankedTopics: DemoTopic[];
  members: DemoMember[];
  votes: DemoVote[];
};

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) {
    throw new Error("Usage: tsx apps/demo/src/post-vote-runner.ts <payload.json>");
  }

  const payload = JSON.parse(await readFile(payloadPath, "utf8")) as DemoPayload;
  const registry = createProviderRegistry();
  const providerSelections = (payload.config.providers ?? {}) as Record<string, ProviderKind>;
  const context: ModuleExecutionContext = moduleExecutionContextSchema.parse({
    runId: `demo-${Date.now()}`,
    startedAt: new Date().toISOString(),
    artifactDir: "data/outputs/demo-runtime",
    providerSelections,
    config: payload.config
  });

  const selection = mapSelection(payload);
  const brief = await registry.content.real?.createBrief(selection, context);
  const slideOutline = await registry.slide.mock?.createOutline(brief!, context);
  const schedulingProviderKind = providerSelections.scheduling ?? "real";
  const schedulingProvider = registry.scheduling?.[schedulingProviderKind];

  if (!brief || !slideOutline || !schedulingProvider) {
    throw new Error(`Unable to resolve demo scheduling pipeline for provider "${String(schedulingProviderKind)}".`);
  }

  const sessionDraft = await schedulingProvider.createSessionDraft({ brief, slideOutline }, context);
  process.stdout.write(`${JSON.stringify(sessionDraft)}\n`);
}

function mapSelection(payload: DemoPayload): TopicSelectionResult {
  const rankedSource = payload.rankedTopics.length > 0 ? payload.rankedTopics : payload.selectedTopics;
  const rankedTopics: RankedTopicList = {
    items: rankedSource.map((topic, index) => ({
      topic: {
        id: topic.id,
        title: topic.title,
        overview: topic.overview,
        background: topic.background || "Generated from demo topic flow.",
        whyNow: topic.whyItMatters || "This topic received the highest team voting signal.",
        targetAudience: topic.targetAudience?.length ? topic.targetAudience : payload.members.map((member) => member.role),
        difficulty: normalizeDifficulty(topic.difficulty),
        expectedImpact: topic.expectedImpact || "Medium",
        relatedGapIds: [`demo-gap-${index + 1}`]
      },
      score: {
        topicId: topic.id,
        relevance: 0.9,
        difficultyFit: 0.8,
        coverage: 0.8,
        novelty: 0.7,
        strategicValue: 0.8,
        total: Number((1 - index * 0.05).toFixed(2)),
        rationale: "Demo ranking preserved UI topic order."
      },
      rank: index + 1
    })),
    scoringVersion: "demo-ui"
  };

  const selectedTopic = rankedTopics.items.find((item) => item.topic.id === payload.selectedTopics[0]?.id)?.topic
    ?? rankedTopics.items[0].topic;
  const voteRecords: VoteRecord[] = payload.votes.map((vote) => ({
    memberId: vote.userId,
    topicId: vote.topicId,
    score: 1,
    reason: vote.reason || "Selected in demo chat panel."
  }));
  const voteTotals = voteRecords.reduce<Record<string, number>>((totals, vote) => {
    totals[vote.topicId] = (totals[vote.topicId] ?? 0) + vote.score;
    return totals;
  }, {});

  return {
    selectedTopic,
    voteRecords,
    voteTotals,
    runnerUps: rankedTopics.items
      .map((item) => item.topic)
      .filter((topic) => topic.id !== selectedTopic.id)
      .slice(0, 2),
    selectionReason: `Demo voting selected "${selectedTopic.title}" as the highest-voted topic.`
  };
}

function normalizeDifficulty(value?: string): "beginner" | "intermediate" | "advanced" {
  const normalized = String(value || "intermediate").trim().toLowerCase();
  if (normalized.startsWith("beg")) return "beginner";
  if (normalized.startsWith("adv")) return "advanced";
  return "intermediate";
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
