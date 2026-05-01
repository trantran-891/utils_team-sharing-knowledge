# Module Contracts

All contracts are implemented as Zod schemas in `packages/schemas/src/index.ts`.

| Module | Input | Output |
| --- | --- | --- |
| Profile | `ModuleExecutionContext` | `TeamProfile` |
| Gap Analysis | `TeamProfile` | `GapAnalysisResult` |
| Topic Generation | `GapAnalysisResult` | `TopicGenerationResult` |
| Topic Ranking | `TopicGenerationResult`, `GapAnalysisResult` | `RankedTopicList` |
| Voting | `RankedTopicList` | `TopicSelectionResult` |
| Content Preparation | `TopicSelectionResult` | `SessionBrief` |
| Slide Draft | `SessionBrief` | `SlideOutline` |
| Scheduling | `SessionBrief`, `SlideOutline` | `SessionDraft` |
| Feedback | `SessionDraft` | `FeedbackSummary` |
| Evaluation | `TopicSelectionResult`, `FeedbackSummary` | `EvaluationResult` |
| Memory | `ArtifactReference[]` | `MemorySaveResult` |

## Rules

- Validate input at provider boundaries when data comes from external systems.
- Validate output before returning to orchestrator.
- Keep stable ids for topics, gaps, sessions, and artifacts.
- Add schema changes intentionally because they affect other teams.

## Fake Web UI Demo Packages

The fake web UI keeps its runnable demo logic in separate `packages/demo-*` folders so the production-oriented TypeScript contracts above remain stable.

| Demo Package | Input | Output |
| --- | --- | --- |
| `demo-ai-runner` | Settings and member profiles | Topic candidates from Codex CLI or mock fallback |
| `demo-topic-generator` | Topic candidates | `data/generated/topic/yyyymmdd/topic_XX/description.md`, `index.json`, `current.json` |
| `demo-voting` | `userId`, `topicId`, vote reason | `data/votes.json`, vote counts, ranked topics |
| `demo-notification` | Socket event payloads | Socket.IO broadcasts to admin and 4 user panels |
| `demo-profile` | Member profile edits | `data/members.json` |
| `demo-settings` | System settings form | `configs/system-settings.json` |
| `demo-feedback` | Rating and comment | `data/comments.json` |
| `demo-session` | Selected topics | `final_document.md`, `vote_summary.md`, `data/sessions.json` |
