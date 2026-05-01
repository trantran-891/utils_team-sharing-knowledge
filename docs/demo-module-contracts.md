# Demo Module Contracts

## `packages/demo-ai-runner`
Input: settings and member profiles.

Output: topic candidates. The package tries Codex CLI first and falls back to mock topics so the demo does not fail.

## `packages/demo-topic-generator`
Input: generated topic candidates.

Output: `data/generated/topic/yyyymmdd/topic_XX/description.md`, cycle `index.json`, and `current.json`.

## `packages/demo-voting`
Input: `userId`, `topicId`, and optional vote reason.

Output: `data/votes.json`, updated topic vote counts, ranked topic list after close voting.

## `packages/demo-notification`
Input: event name and payload from server actions.

Output: Socket.IO broadcasts to dashboard and four user chat panels.

## `packages/demo-profile`
Input: uploaded raw profile JSON/text or member profile edits from the dashboard.

Output: formatted member profiles in `data/members.json`.

## `packages/demo-settings`
Input: system settings form values.

Output: `configs/system-settings.json`.

## `packages/demo-feedback`
Input: `userId`, `topicId`, `rating`, and comment.

Output: `data/comments.json`.

## `packages/demo-session`
Input: selected topics after voting.

Output: `final_document.md`, `vote_summary.md`, and `data/sessions.json`.
