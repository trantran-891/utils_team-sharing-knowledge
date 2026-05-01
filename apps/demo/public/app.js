const socket = io();

const state = {
  settings: null,
  members: [],
  currentTopics: { topics: [] },
  votes: [],
  feedback: [],
  sessions: []
};

const $ = (selector) => document.querySelector(selector);

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function setStatus(text) {
  $("#socketStatus").textContent = text;
}

function addLog(userId, message) {
  const log = document.querySelector(`[data-log="${userId}"]`);
  if (!log) return;
  const line = document.createElement("div");
  line.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  log.prepend(line);
}

function renderSettings() {
  const settings = state.settings || {};
  for (const key of ["generateTopicDay", "notifyDay", "voteDeadlineDay", "sharingDay", "topicsPerCycle", "topicDirection"]) {
    const input = $(`#${key}`);
    if (input) input.value = settings[key] || "";
  }
}

function csv(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

function splitCsv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function renderMembers() {
  $("#memberProfiles").innerHTML = state.members.map((member) => `
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

function renderTopics() {
  const topics = state.currentTopics.topics || [];
  $("#topicList").innerHTML = topics.length ? topics.map((topic) => `
    <article class="topic">
      <h3>${topic.id}: ${topic.title}</h3>
      <p>${topic.overview}</p>
      <p class="meta">Status: ${topic.status || state.currentTopics.status} | Votes: ${topic.voteCount || 0}</p>
      <p class="meta">${topic.descriptionPath || ""}</p>
    </article>
  `).join("") : "No topics generated yet.";
  renderVoting();
  renderUserPanels();
}

function renderVoting() {
  const ranked = state.currentTopics.rankedTopics || [...(state.currentTopics.topics || [])].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  $("#votingResult").innerHTML = ranked.length ? ranked.map((topic, index) => `
    <div class="list-item">
      <strong>#${index + 1} ${topic.title}</strong>
      <div class="meta">${topic.voteCount || 0} vote(s) · ${topic.status || state.currentTopics.status}</div>
    </div>
  `).join("") : "Waiting for votes.";
}

function renderDocuments(session = null) {
  const active = session || state.sessions.at?.(-1);
  $("#documentResult").innerHTML = active?.selectedTopics?.length ? active.selectedTopics.map((topic) => `
    <div class="list-item">
      <strong>${topic.title}</strong>
      <div class="meta">${topic.documentPath || "Document pending"}</div>
    </div>
  `).join("") : "Markdown docs are created after voting.";
}

function renderFeedback() {
  $("#feedbackList").innerHTML = state.feedback.length ? state.feedback.slice().reverse().map((item) => `
    <div class="list-item">
      <strong>${item.userId}</strong> rated ${item.rating}/5 for ${item.topicId}
      <div>${item.comment}</div>
    </div>
  `).join("") : "No feedback yet.";
}

function renderHistory(history = []) {
  $("#historyList").innerHTML = history.length ? history.map((cycle) => `
    <div class="list-item">
      <strong>${cycle.date}</strong> · ${cycle.status}
      <div class="meta">${cycle.topics?.length || 0} topic(s)</div>
    </div>
  `).join("") : "No history yet.";
}

function renderUserPanels() {
  const topics = state.currentTopics.topics || [];
  $("#userPanels").innerHTML = state.members.map((member) => `
    <article class="chat-panel" data-user="${member.id}">
      <h3><span class="avatar">${member.name[0]}</span>${member.name}</h3>
      <p class="meta">${member.role}</p>
      <div class="log" data-log="${member.id}"></div>
      <div class="vote-row">
        <label>Topic
          <select data-vote-topic="${member.id}">
            ${topics.map((topic) => `<option value="${topic.id}">${topic.title}</option>`).join("")}
          </select>
        </label>
        <label>Reason <input data-vote-reason="${member.id}" placeholder="Why this topic?" /></label>
        <button class="small" data-vote-btn="${member.id}" ${topics.length ? "" : "disabled"}>Vote</button>
      </div>
      <div class="feedback-row">
        <label>Rating <input data-rating="${member.id}" type="number" min="1" max="5" value="5" /></label>
        <label>Comment <textarea data-comment="${member.id}" rows="2" placeholder="Feedback after sharing"></textarea></label>
        <button class="small secondary" data-feedback-btn="${member.id}" ${topics.length ? "" : "disabled"}>Submit Feedback</button>
      </div>
    </article>
  `).join("");

  for (const member of state.members) {
    document.querySelector(`[data-vote-btn="${member.id}"]`)?.addEventListener("click", () => submitVote(member.id));
    document.querySelector(`[data-feedback-btn="${member.id}"]`)?.addEventListener("click", () => submitFeedback(member.id));
  }
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
  renderSettings();
  renderMembers();
  renderTopics();
  renderFeedback();
  renderDocuments();
  renderHistory(history);
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
  const members = [...document.querySelectorAll("[data-member]")].map((card) => ({
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
  renderUserPanels();
}

async function submitVote(userId) {
  const topicId = document.querySelector(`[data-vote-topic="${userId}"]`).value;
  const reason = document.querySelector(`[data-vote-reason="${userId}"]`).value;
  const result = await api("/api/votes", {
    method: "POST",
    body: JSON.stringify({ userId, topicId, reason })
  });
  state.currentTopics = result.state;
  renderTopics();
}

async function submitFeedback(userId) {
  const topicId = document.querySelector(`[data-vote-topic="${userId}"]`).value;
  const rating = document.querySelector(`[data-rating="${userId}"]`).value;
  const comment = document.querySelector(`[data-comment="${userId}"]`).value;
  const result = await api("/api/feedback", {
    method: "POST",
    body: JSON.stringify({ userId, topicId, rating, comment })
  });
  state.feedback = result.feedback;
  renderFeedback();
}

$("#saveSettingsBtn").addEventListener("click", saveSettings);
$("#saveMembersBtn").addEventListener("click", saveMembers);
$("#generateTopicsBtn").addEventListener("click", async () => {
  state.currentTopics = await api("/api/topics/generate", { method: "POST" });
  renderTopics();
});
$("#notifyUsersBtn").addEventListener("click", async () => {
  await api("/api/topics/notify", { method: "POST" });
});
$("#closeVotingBtn").addEventListener("click", async () => {
  state.currentTopics = await api("/api/votes/close", { method: "POST" });
  renderTopics();
});
$("#generateDocsBtn").addEventListener("click", async () => {
  const session = await api("/api/docs/generate", { method: "POST" });
  state.sessions.push(session);
  renderDocuments(session);
});

socket.on("connect", () => setStatus("Socket connected"));
socket.on("disconnect", () => setStatus("Socket disconnected"));
socket.on("topics:generated", (payload) => {
  state.currentTopics = payload;
  renderTopics();
  state.members.forEach((member) => addLog(member.id, "Topics generated."));
});
socket.on("topics:notify", (payload) => {
  state.members.forEach((member) => addLog(member.id, payload.message));
});
socket.on("vote:updated", (payload) => {
  state.currentTopics = payload;
  renderTopics();
  state.members.forEach((member) => addLog(member.id, "Vote result updated."));
});
socket.on("voting:closed", (payload) => {
  state.currentTopics = payload;
  renderTopics();
  state.members.forEach((member) => addLog(member.id, "Voting closed."));
});
socket.on("session:docs-created", (payload) => {
  renderDocuments(payload);
  state.members.forEach((member) => addLog(member.id, "Markdown docs created."));
});
socket.on("feedback:updated", (payload) => {
  state.feedback = payload.feedback;
  renderFeedback();
});

refresh().catch((error) => {
  console.error(error);
  setStatus("Initial load failed");
});
