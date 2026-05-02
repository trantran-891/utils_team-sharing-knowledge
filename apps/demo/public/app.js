const socket = io();
const page = document.body.dataset.page;

const state = {
  settings: null,
  members: [],
  currentTopics: { topics: [] },
  feedback: [],
  sessions: [],
  latestSession: null,
  history: []
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function setText(selector, text) {
  const element = $(selector);
  if (element) element.textContent = text;
}

function setStatus(text) {
  setText("#socketStatus", text);
}

function csv(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function splitCsv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function addLog(userId, message) {
  const log = document.querySelector(`[data-log="${userId}"]`);
  if (!log) return;
  const line = document.createElement("div");
  line.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  log.prepend(line);
}

function chatInitialLogMarkup() {
  const topics = state.currentTopics.topics || [];
  const votes = state.currentTopics.votes || [];
  const voteLogs = votes.map((vote) => {
    const member = state.members.find((item) => item.id === vote.userId);
    const topic = topics.find((item) => item.id === vote.topicId);
    return `<div>${member?.name || vote.userId} selected "${topic?.title || vote.topicId}".</div>`;
  }).join("");

  if (state.currentTopics.notifiedAt && topics.length) {
    return `
      <div>${new Date(state.currentTopics.notifiedAt).toLocaleTimeString()} ${state.currentTopics.notificationMessage || state.currentTopics.message || "Weekly sharing topics are ready. Please vote for one topic."}</div>
      <div>${topics.length} topic(s) available for voting.</div>
      ${voteLogs}
    `;
  }
  if (topics.length) {
    return `
      <div>${topics.length} topic(s) available. Notification state was loaded from storage.</div>
      ${voteLogs}
    `;
  }
  return "<div>Waiting for topic notifications...</div>";
}

function renderPreparedTopicsNotice() {
  const session = state.latestSession;
  if (!session?.selectedTopics?.length) return "";
  const topics = [...session.selectedTopics].sort((a, b) => (a.selectedRank || 999) - (b.selectedRank || 999));
  return `
    <section class="sharing-notice">
      <div class="notice-kicker">AI documents ready</div>
      <h4>${session.sharingDateTime || "Sharing time will be confirmed soon"}</h4>
      <p>${session.message || "Prepared markdown documents are ready for the selected topics."}</p>
      <div class="priority-list">
        ${topics.map((topic, index) => `
          <div class="priority-item">
            <span class="priority-badge">P${topic.selectedRank || index + 1}</span>
            <div>
              <strong>${topic.title}</strong>
              <small>${topic.voteCount || 0} vote(s) · ${topic.documentPath || "document ready"}</small>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSettings() {
  if (page !== "admin") return;
  const settings = state.settings || {};
  for (const key of ["generateTopicDay", "notifyDay", "voteDeadlineDay", "sharingDay", "topicsPerCycle", "topicDirection"]) {
    const input = $(`#${key}`);
    if (input) input.value = settings[key] || "";
  }
}

function renderMembers() {
  if (page === "admin") {
    const target = $("#memberProfiles");
    if (!target) return;
    target.innerHTML = state.members.map((member) => `
      <article class="profile" data-member="${member.id}">
        <h3>${member.name}</h3>
        <label>Name <input data-field="name" value="${member.name}" /></label>
        <label>Role <input data-field="role" value="${member.role}" /></label>
        <label>Level <input data-field="level" value="${member.level}" /></label>
        <label>Hard skills <input data-field="hardSkills" value="${csv(member.hardSkills)}" /></label>
        <label>Soft skills <input data-field="softSkills" value="${csv(member.softSkills)}" /></label>
        <label>Goals <input data-field="goals" value="${csv(member.goals)}" /></label>
        <label>Pain points <input data-field="painPoints" value="${csv(member.painPoints)}" /></label>
      </article>
    `).join("");
  }

  if (page === "chats") renderUserPanels();
  if (page === "feedback") renderFeedbackForm();
}

function renderTopics() {
  if (page === "admin") {
    const topics = state.currentTopics.topics || [];
    const target = $("#topicList");
    if (target) {
      target.innerHTML = topics.length ? topics.map((topic) => `
        <article class="topic">
          <h3>${topic.id}: ${topic.title}</h3>
          <p>${topic.overview}</p>
          <p class="meta">Status: ${topic.status || state.currentTopics.status} | Votes: ${topic.voteCount || 0}</p>
          <p class="meta">${topic.descriptionPath || ""}</p>
        </article>
      `).join("") : "No topics generated yet.";
    }
    renderVoting();
    renderDocuments();
  }

  if (page === "chats") renderUserPanels();
  if (page === "feedback") renderFeedbackForm();
}

function renderVoting() {
  if (page !== "admin") return;
  const target = $("#votingResult");
  if (!target) return;
  const ranked = state.currentTopics.rankedTopics || [...(state.currentTopics.topics || [])].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  target.innerHTML = ranked.length ? ranked.map((topic, index) => `
    <div class="list-item">
      <strong>#${index + 1} ${topic.title}</strong>
      <div class="meta">${topic.voteCount || 0} vote(s) · ${topic.status || state.currentTopics.status}</div>
    </div>
  `).join("") : "Waiting for votes.";
}

function renderDocuments(session = null) {
  if (page !== "admin") return;
  const target = $("#documentResult");
  if (!target) return;
  const active = session || state.sessions.at?.(-1);
  target.innerHTML = active?.selectedTopics?.length ? active.selectedTopics.map((topic) => `
    <div class="list-item">
      <strong>${topic.title}</strong>
      <div class="meta">${topic.documentPath || "Document pending"}</div>
    </div>
  `).join("") : "Markdown docs are created after voting.";
}

function renderHistory() {
  if (page !== "admin") return;
  const target = $("#historyList");
  if (!target) return;
  target.innerHTML = state.history.length ? state.history.map((cycle) => `
    <div class="list-item">
      <strong>${cycle.date}</strong> · ${cycle.status}
      <div class="meta">${cycle.topics?.length || 0} topic(s)</div>
    </div>
  `).join("") : "No history yet.";
}

function renderUserPanels() {
  if (page !== "chats") return;
  const target = $("#userPanels");
  if (!target) return;
  const topics = state.currentTopics.topics || [];
  const votes = state.currentTopics.votes || [];
  target.innerHTML = state.members.map((member) => `
    ${renderUserPanel(member, topics, votes)}
  `).join("");

  for (const member of state.members) {
    document.querySelector(`[data-vote-btn="${member.id}"]`)?.addEventListener("click", () => submitVote(member.id));
  }
}

function renderUserPanel(member, topics, votes) {
  const vote = votes.find((item) => item.userId === member.id);
  const selectedTopic = vote ? topics.find((topic) => topic.id === vote.topicId) : null;
  const docsReady = state.latestSession?.selectedTopics?.length || state.currentTopics.status === "documented";

  return `
    <article class="chat-panel ${vote ? "voted" : ""}" data-user="${member.id}">
      <h3><span class="avatar">${member.name[0]}</span>${member.name}</h3>
      <p class="meta">${member.role}</p>
      <div class="log" data-log="${member.id}">
        ${chatInitialLogMarkup()}
      </div>
      ${renderPreparedTopicsNotice()}
      ${vote ? `
        <div class="vote-alert">Selected: <strong>${selectedTopic?.title || vote.topicId}</strong></div>
        ${docsReady ? `<div class="docs-alert">Documents are ready. See priority list above.</div>` : ""}
      ` : `
        <div class="vote-row">
          <label>Topic
            <select data-vote-topic="${member.id}">
              ${topics.map((topic) => `<option value="${topic.id}">${topic.title}</option>`).join("")}
            </select>
          </label>
          <label>Reason <input data-vote-reason="${member.id}" placeholder="Why this topic?" /></label>
          <button class="small" data-vote-btn="${member.id}" ${topics.length ? "" : "disabled"}>Vote</button>
        </div>
      `}
    </article>
  `;
}

function renderFeedbackForm() {
  if (page !== "feedback") return;
  const userSelect = $("#feedbackUser");
  const topicSelect = $("#feedbackTopic");
  if (userSelect) {
    userSelect.innerHTML = state.members.map((member) => `<option value="${member.id}">${member.name} - ${member.role}</option>`).join("");
  }
  if (topicSelect) {
    const selected = state.currentTopics.selectedTopics || state.currentTopics.topics || [];
    topicSelect.innerHTML = selected.map((topic) => `<option value="${topic.id}">${topic.title}</option>`).join("");
  }
  renderFeedbackList();
}

function renderFeedbackList() {
  if (page !== "feedback") return;
  const target = $("#feedbackList");
  if (!target) return;
  target.innerHTML = state.feedback.length ? state.feedback.slice().reverse().map((item) => `
    <div class="list-item">
      <strong>${item.userId}</strong> rated ${item.rating}/5 for ${item.topicId}
      <div>${item.comment}</div>
    </div>
  `).join("") : "No feedback yet.";
}

async function refresh() {
  const [settings, members, currentTopics, voteState, feedback, sessions, history] = await Promise.all([
    api("/api/settings"),
    api("/api/members"),
    api("/api/topics/current"),
    api("/api/votes/current"),
    api("/api/feedback"),
    api("/api/sessions"),
    api("/api/topics/history")
  ]);
  state.settings = settings;
  state.members = members;
  state.currentTopics = { ...currentTopics, votes: voteState.votes };
  state.feedback = feedback;
  state.sessions = sessions;
  state.latestSession = sessions.slice().reverse().find((session) => (
    currentTopics.cycleId ? session.cycleId === currentTopics.cycleId : session.date === currentTopics.date
  )) || null;
  state.history = history;
  renderSettings();
  renderMembers();
  renderTopics();
  renderHistory();
  renderFeedbackList();
}

async function saveSettings() {
  state.settings = await api("/api/settings", {
    method: "POST",
    body: JSON.stringify({
      generateTopicDay: $("#generateTopicDay").value,
      notifyDay: $("#notifyDay").value,
      voteDeadlineDay: $("#voteDeadlineDay").value,
      sharingDay: $("#sharingDay").value,
      topicsPerCycle: Number($("#topicsPerCycle").value || 6),
      topicDirection: $("#topicDirection").value
    })
  });
  renderSettings();
}

async function saveMembers() {
  const members = $$("[data-member]").map((card) => ({
    id: card.dataset.member,
    name: card.querySelector('[data-field="name"]').value,
    role: card.querySelector('[data-field="role"]').value,
    level: card.querySelector('[data-field="level"]').value,
    hardSkills: splitCsv(card.querySelector('[data-field="hardSkills"]').value),
    softSkills: splitCsv(card.querySelector('[data-field="softSkills"]').value),
    goals: splitCsv(card.querySelector('[data-field="goals"]').value),
    painPoints: splitCsv(card.querySelector('[data-field="painPoints"]').value)
  }));
  state.members = await api("/api/members", {
    method: "POST",
    body: JSON.stringify({ members })
  });
  renderMembers();
}

async function importProfiles() {
  const file = $("#profileUpload")?.files?.[0];
  if (!file) {
    setText("#mainStatus", "Choose a profile file first.");
    return;
  }
  const content = await file.text();
  state.members = await api("/api/members/import", {
    method: "POST",
    body: JSON.stringify({ content })
  });
  renderMembers();
  setText("#mainStatus", "Profiles imported and formatted.");
}

async function generateAndNotify() {
  setText("#mainStatus", "Generating topics and sending notifications...");
  state.currentTopics = await api("/api/topics/generate-and-notify", { method: "POST" });
  renderTopics();
  setText("#mainStatus", `Generated ${state.currentTopics.topics.length} topics and notified members.`);
}

async function submitVote(userId) {
  const topicId = document.querySelector(`[data-vote-topic="${userId}"]`).value;
  const reason = document.querySelector(`[data-vote-reason="${userId}"]`).value;
  const result = await api("/api/votes", {
    method: "POST",
    body: JSON.stringify({ userId, topicId, reason })
  });
  state.currentTopics = result.state;
  renderUserPanels();
}

async function submitFeedback() {
  const result = await api("/api/feedback", {
    method: "POST",
    body: JSON.stringify({
      userId: $("#feedbackUser").value,
      topicId: $("#feedbackTopic").value,
      rating: $("#feedbackRating").value,
      comment: $("#feedbackComment").value
    })
  });
  state.feedback = result.feedback;
  $("#feedbackComment").value = "";
  renderFeedbackList();
}

function bindAdmin() {
  $$("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => $(`#${button.dataset.openModal}`)?.showModal());
  });
  $("#generateAndNotifyBtn")?.addEventListener("click", generateAndNotify);
  $("#saveSettingsBtn")?.addEventListener("click", saveSettings);
  $("#saveMembersBtn")?.addEventListener("click", saveMembers);
  $("#importProfilesBtn")?.addEventListener("click", importProfiles);
  $("#closeVotingBtn")?.addEventListener("click", async () => {
    state.currentTopics = await api("/api/votes/close", { method: "POST" });
    renderTopics();
  });
  $("#generateDocsBtn")?.addEventListener("click", async () => {
    const session = await api("/api/docs/generate", { method: "POST" });
    state.sessions.push(session);
    renderDocuments(session);
  });
}

function bindFeedback() {
  $("#submitFeedbackBtn")?.addEventListener("click", submitFeedback);
}

socket.on("connect", () => setStatus("Socket connected"));
socket.on("disconnect", () => setStatus("Socket disconnected"));
socket.on("topics:generated", (payload) => {
  state.currentTopics = payload;
  renderTopics();
  state.members.forEach((member) => addLog(member.id, "Topics generated."));
});
socket.on("topics:notify", (payload) => {
  state.currentTopics = payload;
  renderTopics();
  state.members.forEach((member) => addLog(member.id, payload.message));
});
socket.on("vote:updated", (payload) => {
  state.currentTopics = payload;
  renderTopics();
  state.members.forEach((member) => addLog(member.id, payload.lastVote?.message || "Vote result updated."));
});
socket.on("voting:closed", (payload) => {
  state.currentTopics = payload;
  renderTopics();
  state.members.forEach((member) => addLog(member.id, payload.message || "Voting closed."));
});
socket.on("session:docs-created", (payload) => {
  state.latestSession = payload;
  renderDocuments(payload);
  renderUserPanels();
  const topics = payload.selectedTopics
    ?.slice()
    .sort((a, b) => (a.selectedRank || 999) - (b.selectedRank || 999))
    .map((topic, index) => `P${topic.selectedRank || index + 1}: ${topic.title}`)
    .join(", ");
  state.members.forEach((member) => {
    addLog(member.id, payload.message || "Markdown docs created.");
    if (topics) addLog(member.id, `Prepared topics: ${topics}`);
  });
});
socket.on("feedback:updated", (payload) => {
  state.feedback = payload.feedback;
  renderFeedbackList();
});

if (page === "admin") bindAdmin();
if (page === "feedback") bindFeedback();

refresh().catch((error) => {
  console.error(error);
  setText("#mainStatus", "Initial load failed.");
  setStatus("Initial load failed");
});
