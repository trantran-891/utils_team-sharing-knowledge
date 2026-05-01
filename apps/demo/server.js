import express from "express";
import http from "node:http";
import path from "node:path";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";

import { addFeedback, readFeedback } from "../../packages/demo-feedback/feedbackStore.js";
import { formatImportedProfiles } from "../../packages/demo-profile/profileFormatter.js";
import { readMembers, upsertMember, writeMembers } from "../../packages/demo-profile/memberStore.js";
import { createSocketNotifier } from "../../packages/demo-notification/socketNotifier.js";
import { completeSession, generateFinalDocuments, readSessions } from "../../packages/demo-session/sessionStore.js";
import { readSettings, writeSettings } from "../../packages/demo-settings/settingsStore.js";
import { generateWeeklyTopics } from "../../packages/demo-topic-generator/index.js";
import { readCurrentTopics, readTopicHistory } from "../../packages/demo-topic-generator/topicStore.js";
import { closeVoting, createVote, getCurrentVoteState } from "../../packages/demo-voting/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const notifier = createSocketNotifier(io);
const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || "Unexpected server error" });
    }
  };
}

app.get("/api/settings", asyncHandler(async (_req, res) => {
  res.json(await readSettings());
}));

app.post("/api/settings", asyncHandler(async (req, res) => {
  res.json(await writeSettings(req.body));
}));

app.get("/api/members", asyncHandler(async (_req, res) => {
  res.json(await readMembers());
}));

app.post("/api/members", asyncHandler(async (req, res) => {
  res.json(await writeMembers(req.body.members || req.body));
}));

app.put("/api/members/:id", asyncHandler(async (req, res) => {
  res.json(await upsertMember({ ...req.body, id: req.params.id }));
}));

app.post("/api/members/import", asyncHandler(async (req, res) => {
  const members = formatImportedProfiles(req.body.content || req.body.members || req.body);
  res.json(await writeMembers(members));
}));

app.get("/api/topics/current", asyncHandler(async (_req, res) => {
  res.json(await readCurrentTopics());
}));

app.post("/api/topics/generate", asyncHandler(async (_req, res) => {
  const result = await generateWeeklyTopics();
  notifier.topicsGenerated(result);
  res.json(result);
}));

app.post("/api/topics/notify", asyncHandler(async (_req, res) => {
  const current = await readCurrentTopics();
  const payload = {
    message: "Weekly sharing topics are ready. Please vote for one topic.",
    ...current
  };
  notifier.topicsNotify(payload);
  res.json(payload);
}));

app.post("/api/topics/generate-and-notify", asyncHandler(async (_req, res) => {
  const result = await generateWeeklyTopics();
  notifier.topicsGenerated(result);
  const payload = {
    message: "Weekly sharing topics are ready. Please vote for one topic.",
    ...result
  };
  notifier.topicsNotify(payload);
  res.json(payload);
}));

app.get("/api/topics/history", asyncHandler(async (_req, res) => {
  res.json(await readTopicHistory());
}));

app.get("/api/votes/current", asyncHandler(async (_req, res) => {
  res.json(await getCurrentVoteState());
}));

app.post("/api/votes", asyncHandler(async (req, res) => {
  const result = await createVote(req.body);
  notifier.voteUpdated(result.state);
  res.json(result);
}));

app.post("/api/votes/close", asyncHandler(async (_req, res) => {
  const result = await closeVoting();
  notifier.votingClosed(result);
  res.json(result);
}));

app.post("/api/docs/generate", asyncHandler(async (_req, res) => {
  const session = await generateFinalDocuments();
  notifier.docsCreated(session);
  res.json(session);
}));

app.get("/api/feedback", asyncHandler(async (_req, res) => {
  res.json(await readFeedback());
}));

app.post("/api/feedback", asyncHandler(async (req, res) => {
  const saved = await addFeedback(req.body);
  const feedback = await readFeedback();
  notifier.feedbackUpdated({ saved, feedback });
  res.json({ saved, feedback });
}));

app.get("/api/sessions", asyncHandler(async (_req, res) => {
  res.json(await readSessions());
}));

app.post("/api/sessions/complete", asyncHandler(async (_req, res) => {
  res.json(await completeSession());
}));

io.on("connection", (socket) => {
  socket.emit("system:log", {
    event: "socket:connected",
    message: "Connected to demo notification stream",
    createdAt: new Date().toISOString()
  });

  socket.on("user:vote", async (payload) => {
    const result = await createVote(payload);
    notifier.voteUpdated(result.state);
  });

  socket.on("user:feedback", async (payload) => {
    const saved = await addFeedback(payload);
    const feedback = await readFeedback();
    notifier.feedbackUpdated({ saved, feedback });
  });
});

server.listen(port, host, () => {
  console.log(`AI Team Sharing Assistant demo running at http://${host}:${port}`);
});
