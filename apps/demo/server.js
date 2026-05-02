import express from "express";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";

import { addFeedback, readFeedback } from "../../packages/demo-feedback/feedbackStore.js";
import { formatImportedProfiles } from "../../packages/demo-profile/profileFormatter.js";
import { readMembers, upsertMember, writeMembers } from "../../packages/demo-profile/memberStore.js";
import { createSocketNotifier } from "../../packages/demo-notification/socketNotifier.js";
import { runPostVoteScheduling } from "../../packages/demo-session/postVoteAutomation.js";
import { attachSessionDraft, completeSession, generateFinalDocuments, readSessions } from "../../packages/demo-session/sessionStore.js";
import { readSettings, writeSettings } from "../../packages/demo-settings/settingsStore.js";
import { generateWeeklyTopics } from "../../packages/demo-topic-generator/index.js";
import { readCurrentTopics, readTopicHistory, writeCurrentTopics } from "../../packages/demo-topic-generator/topicStore.js";
import { closeVoting, createVote, getCurrentVoteState } from "../../packages/demo-voting/index.js";
import { writeVotes } from "../../packages/demo-voting/voteStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const notifier = createSocketNotifier(io);
const port = process.env.PORT || 3000;
const host = process.env.HOST || "127.0.0.1";
const draftAutomationConfigPath = process.env.DEMO_AUTOMATION_DRAFT_CONFIG
  || process.env.DEMO_AUTOMATION_CONFIG
  || "configs/google-oauth-personal-post-voting-dry-run.json";
const liveAutomationConfigPath = process.env.DEMO_AUTOMATION_LIVE_CONFIG
  || "configs/google-oauth-personal-post-voting-live.json";
const votingAutomation = new Set();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      const message = error?.message || "Unexpected server error";
      const lower = String(message).toLowerCase();
      const statusCode = lower.includes("bad request") || /\b400\b/.test(String(message)) ? 400 : 500;
      res.status(statusCode).json({ error: message });
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
  await writeVotes([]);
  const result = await generateWeeklyTopics();
  votingAutomation.delete(result.date);
  notifier.topicsGenerated(result);
  res.json(result);
}));

app.post("/api/topics/notify", asyncHandler(async (_req, res) => {
  const current = await getCurrentVoteState();
  const payload = await writeCurrentTopics({
    ...current,
    message: "Weekly sharing topics are ready. Please vote for one topic.",
    notificationMessage: "Weekly sharing topics are ready. Please vote for one topic.",
    notifiedAt: new Date().toISOString()
  });
  notifier.topicsNotify(payload);
  res.json(payload);
}));

app.post("/api/topics/generate-and-notify", asyncHandler(async (_req, res) => {
  await writeVotes([]);
  const result = await generateWeeklyTopics();
  votingAutomation.delete(result.date);
  notifier.topicsGenerated(result);
  const payload = await writeCurrentTopics({
    ...result,
    message: "Weekly sharing topics are ready. Please vote for one topic.",
    notificationMessage: "Weekly sharing topics are ready. Please vote for one topic.",
    notifiedAt: new Date().toISOString()
  });
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
  await notifyVoteAndMaybeCreateDocs(result);
  res.json(result);
}));

app.post("/api/votes/close", asyncHandler(async (_req, res) => {
  const result = await closeVoting();
  const finalized = await finalizeClosedVoting({
    ...result,
    message: "Admin closed voting and is sending the final sharing notification."
  }, { mode: "live" });
  res.json(finalized.currentState);
}));

app.post("/api/docs/generate", asyncHandler(async (_req, res) => {
  const result = await closeVoting();
  const finalized = await finalizeClosedVoting(result);
  res.json(finalized.session);
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

app.post("/api/sessions/run-post-vote", asyncHandler(async (_req, res) => {
  const session = await triggerPostVoteScheduling({ mode: "draft" });
  res.json(session);
}));

app.post("/api/sessions/send-notifications", asyncHandler(async (_req, res) => {
  const session = await triggerPostVoteScheduling({ mode: "live" });
  res.json(session);
}));

app.post("/api/sessions/complete", asyncHandler(async (_req, res) => {
  res.json(await completeSession());
}));

io.on("connection", async (socket) => {
  socket.emit("system:log", {
    event: "socket:connected",
    message: "Connected to demo notification stream",
    createdAt: new Date().toISOString()
  });

  const current = await getCurrentVoteState();
  if (current.notifiedAt && current.topics?.length) {
    socket.emit("topics:notify", current);
  }
  const sessions = await readSessions();
  const latestSession = sessions.slice().reverse().find((session) => (
    current.cycleId ? session.cycleId === current.cycleId : session.date === current.date
  ));
  if (latestSession?.status === "documented") {
    socket.emit("session:docs-created", latestSession);
  }
  if (latestSession?.sessionDraft) {
    socket.emit("session:scheduled", latestSession);
  }

  socket.on("user:vote", async (payload) => {
    const result = await createVote(payload);
    await notifyVoteAndMaybeCreateDocs(result);
  });

  socket.on("user:feedback", async (payload) => {
    const saved = await addFeedback(payload);
    const feedback = await readFeedback();
    notifier.feedbackUpdated({ saved, feedback });
  });
});

function memberName(members, userId) {
  return members.find((member) => member.id === userId)?.name || userId;
}

function topicTitle(topics, topicId) {
  return topics.find((topic) => topic.id === topicId)?.title || topicId;
}

function nextSharingDateLabel(settings) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetIndex = days.indexOf(settings.sharingDay || "Friday");
  if (targetIndex < 0) return `${settings.sharingDay || "Friday"} 16:00`;

  const now = new Date();
  const date = new Date(now);
  const diff = (targetIndex - now.getDay() + 7) % 7;
  date.setDate(now.getDate() + diff);
  return `${days[targetIndex]}, ${date.toISOString().slice(0, 10)} 16:00`;
}

async function notifyVoteAndMaybeCreateDocs(result) {
  const members = await readMembers();
  const topics = result.state.topics || [];
  const saved = result.saved;
  const voteMessage = `${memberName(members, saved.userId)} selected "${topicTitle(topics, saved.topicId)}".`;
  const state = {
    ...result.state,
    lastVote: {
      ...saved,
      memberName: memberName(members, saved.userId),
      topicTitle: topicTitle(topics, saved.topicId),
      message: voteMessage
    }
  };

  notifier.voteUpdated(state);

  const votedUsers = new Set((state.votes || []).map((vote) => vote.userId));
  const allMembersVoted = members.length > 0 && members.every((member) => votedUsers.has(member.id));
  if (!allMembersVoted || votingAutomation.has(state.date) || state.status === "documented" || state.status === "closed") return;

  votingAutomation.add(state.date);
  const readyState = await writeCurrentTopics({
    ...state,
    message: "All members have voted. Admin can now close voting and send the final schedule notification.",
    votingReadyForClose: true
  });
  notifier.voteUpdated(readyState);
}

async function loadAutomationConfig(mode = "draft") {
  const configPath = mode === "live" ? liveAutomationConfigPath : draftAutomationConfigPath;
  const config = JSON.parse(await readFile(path.resolve(configPath), "utf8"));
  if (mode === "draft") {
    if (config.googlePersonal) {
      config.googlePersonal = {
        ...config.googlePersonal,
        dryRun: true,
        sendTopicAnnouncementEmail: false,
        sendConfirmationEmail: false
      };
    }
    if (config.googleWorkspace) {
      config.googleWorkspace = {
        ...config.googleWorkspace,
        dryRun: true,
        sendTopicAnnouncementEmail: false,
        sendConfirmationEmail: false
      };
    }
  }
  return config;
}

async function triggerPostVoteScheduling({ mode = "draft" } = {}) {
  const current = await readCurrentTopics();
  const members = await readMembers();
  const settings = await readSettings();
  const sessions = await readSessions();
  const latestSession = sessions.at(-1);
  if (!latestSession || !current.selectedTopics?.length) return latestSession ?? null;

  const config = await loadAutomationConfig(mode);
  const sessionDraft = await runPostVoteScheduling({
    config,
    selectedTopics: current.selectedTopics,
    rankedTopics: current.rankedTopics || current.topics || [],
    members,
    votes: current.votes || []
  });
  return attachSessionDraft(latestSession.id, {
    ...sessionDraft,
    sharingDay: settings.sharingDay
  });
}

async function finalizeClosedVoting(closedState, { mode = "draft" } = {}) {
  notifier.votingClosed(closedState);
  const settings = await readSettings();
  const sharingDateTime = nextSharingDateLabel(settings);
  const session = await generateFinalDocuments({
    sharingDateTime,
    message: `Documents are ready for ${sharingDateTime}.`
  });
  notifier.docsCreated({
    ...session,
    selectedTopicTitles: session.selectedTopics.map((topic) => topic.title)
  });
  const scheduledSession = await triggerPostVoteScheduling({ mode });
  if (scheduledSession?.sessionDraft) {
    notifier.sessionScheduled(scheduledSession);
  }

  return {
    session: scheduledSession || session,
    currentState: {
      ...closedState,
      sessionDraft: scheduledSession?.sessionDraft
    }
  };
}

server.listen(port, host, () => {
  console.log(`AI Team Sharing Assistant demo running at http://${host}:${port}`);
});
