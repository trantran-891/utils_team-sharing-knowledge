# AI Team Sharing Assistant

Skeleton project for orchestrating an AI-assisted team knowledge sharing workflow.

The current goal is not a full product. This repo defines the workflow, contracts, module boundaries, mock providers, artifacts, and tests so different team members can implement real providers independently later.

## Current Workflow

```text
Load team profiles
-> Analyze knowledge gaps
-> Generate topics
-> Rank topics
-> Export topics for voting
-> Simulate vote result
-> Select winning topic
-> Generate topic brief
-> Generate slide outline
-> Create session draft
-> Simulate feedback
-> Evaluate session
-> Save all artifacts
```

## Run

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run build
npm test
```

Run the mock workflow:

```bash
npm run workflow:mock
```

Run the fake web UI demo:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

Open all demo views at once:

```bash
./start.sh
```

Current demo views:

```text
Admin action center  http://127.0.0.1:3000/
User chat voting    http://127.0.0.1:3000/chats.html
Feedback form       http://127.0.0.1:3000/feedback.html
```

The demo uses Node.js, Express, Socket.IO, HTML, CSS, and vanilla JavaScript. It does not use a frontend framework or production database. Topic artifacts are written to:

```text
data/generated/topic/yyyymmdd/topic_XX/
```

Each generated topic gets a `description.md`. After voting is closed, the demo creates `final_document.md` and `vote_summary.md` for selected topics. Slide generation is intentionally left for future development.

Artifacts are written to:

```text
data/outputs/<runId>/
```

## Structure

```text
apps/orchestrator              Workflow entrypoint
packages/core                  Workflow runner, artifact writer, provider resolver
packages/schemas               Shared Zod schemas and TypeScript types
packages/shared                Small common utilities
packages/*-module              Module interface, mock provider, real placeholder
configs/default.json           Provider selection and sample paths
data/samples                   Demo input data
data/outputs                   Generated run artifacts
docs                           Architecture, contracts, workflows, prompts
tests                          Schema, module, and workflow tests
```

## Fake Web UI Demo

Demo app:

```text
apps/demo/server.js
apps/demo/public/index.html
apps/demo/public/chats.html
apps/demo/public/feedback.html
apps/demo/public/styles.css
apps/demo/public/app.js
```

Demo-specific packages:

```text
packages/demo-ai-runner
packages/demo-topic-generator
packages/demo-voting
packages/demo-notification
packages/demo-profile
packages/demo-feedback
packages/demo-settings
packages/demo-session
```

Demo docs:

```text
docs/demo-script.md
docs/future-todo.md
docs/demo-module-contracts.md
```

## Provider Switching

Provider selection lives in `configs/default.json`:

```json
{
  "providers": {
    "topicGeneration": "mock",
    "content": "mock"
  }
}
```

To add a real provider:

1. Implement the module interface in the relevant `packages/*-module/src/index.ts`.
2. Validate all input and output with schemas from `packages/schemas`.
3. Register the provider in `apps/orchestrator/src/index.ts`.
4. Change the provider key in `configs/default.json`.
5. Add or update tests for the new provider behavior.

## Module Rule

The orchestrator only coordinates. Module-specific logic belongs inside module providers. No module should pass arbitrary objects to the next step; all public input and output must follow shared schemas.

## Handoff Docs

- Contract overview: `docs/contracts/module-contracts.md`
- Example payloads: `docs/contracts/module-examples.md`
- Integration checklist: `docs/module-integration-guide.md`
- Google Workspace setup: `docs/google-workspace-setup.md`
- Google personal OAuth setup: `docs/google-oauth-personal-setup.md`
