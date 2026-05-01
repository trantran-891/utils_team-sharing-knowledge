const topicSeeds = [
  {
    title: "System Design Basics for Feature Teams",
    overview: "A practical introduction to system design decisions for small feature teams.",
    background: "The team is touching more services and needs a shared language for tradeoffs.",
    whyItMatters: "Better design conversations reduce rework and make implementation plans clearer.",
    difficulty: "Intermediate",
    expectedImpact: "High"
  },
  {
    title: "Risk-Based Testing Before Release",
    overview: "How QA, engineers, and BA can identify the riskiest flows before a release.",
    background: "Recent work needs faster confidence without expanding the full regression scope.",
    whyItMatters: "The team can spend testing time where defects would hurt users most.",
    difficulty: "Beginner",
    expectedImpact: "High"
  },
  {
    title: "Frontend Performance Checks Without Heavy Tooling",
    overview: "A lightweight checklist for measuring and improving perceived UI speed.",
    background: "The demo product has simple pages, but performance habits should start early.",
    whyItMatters: "Small frontend decisions compound into user-visible latency and instability.",
    difficulty: "Beginner",
    expectedImpact: "Medium"
  },
  {
    title: "Writing Acceptance Criteria That Engineers Can Build From",
    overview: "How to turn product intent into examples, edge cases, and testable outcomes.",
    background: "The team often needs clarification during implementation and test planning.",
    whyItMatters: "Sharper acceptance criteria reduce handoff friction across BA, dev, and QA.",
    difficulty: "Beginner",
    expectedImpact: "High"
  },
  {
    title: "Debugging Playbooks for Common Production Issues",
    overview: "Create repeatable incident debugging steps for API, database, and UI issues.",
    background: "Shared playbooks help less experienced members contribute during incidents.",
    whyItMatters: "The team can reduce mean time to understand and recover from failures.",
    difficulty: "Intermediate",
    expectedImpact: "High"
  },
  {
    title: "Practical API Contract Review",
    overview: "A review checklist for API shape, error handling, versioning, and frontend needs.",
    background: "Frontend and backend alignment is a recurring source of implementation delays.",
    whyItMatters: "Early contract review prevents avoidable integration bugs.",
    difficulty: "Intermediate",
    expectedImpact: "Medium"
  }
];

export async function runMockTopicPrompt({ settings, members }) {
  const limit = Math.max(1, Number(settings.topicsPerCycle || 6));
  return topicSeeds.slice(0, limit).map((seed, index) => ({
    id: `topic_${String(index + 1).padStart(2, "0")}`,
    ...seed,
    targetAudience: members.map((member) => member.role),
    status: "generated",
    voteCount: 0
  }));
}
