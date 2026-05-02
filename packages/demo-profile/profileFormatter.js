const defaultRoles = ["Backend Developer", "QA Engineer", "Frontend Developer", "Business Analyst"];

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function inferRole(text, index) {
  const lower = text.toLowerCase();
  if (lower.includes("qa") || lower.includes("test")) return "QA Engineer";
  if (lower.includes("front")) return "Frontend Developer";
  if (lower.includes("ba") || lower.includes("business")) return "Business Analyst";
  if (lower.includes("back") || lower.includes("api") || lower.includes("node")) return "Backend Developer";
  return defaultRoles[index] || "Team Member";
}

function inferSkills(text) {
  const skills = [];
  const lower = text.toLowerCase();
  const candidates = [
    ["node", "Node.js"],
    ["api", "API"],
    ["database", "Database"],
    ["sql", "SQL"],
    ["test", "Testing"],
    ["automation", "Automation"],
    ["frontend", "Frontend"],
    ["javascript", "JavaScript"],
    ["css", "CSS"],
    ["requirement", "Requirements"],
    ["analysis", "Analysis"]
  ];
  for (const [needle, label] of candidates) {
    if (lower.includes(needle)) skills.push(label);
  }
  return skills.length ? [...new Set(skills)] : ["Team Collaboration"];
}

function normalizeMember(raw, index) {
  const text = JSON.stringify(raw);
  const name = raw.name || raw.fullName || raw.memberName || `User ${index + 1}`;
  return {
    id: raw.id || `user_${String(index + 1).padStart(2, "0")}`,
    name: String(name).trim(),
    role: raw.role || raw.title || inferRole(text, index),
    level: raw.level || raw.seniority || "Mid",
    hardSkills: normalizeList(raw.hardSkills || raw.skills || raw.technicalSkills).length
      ? normalizeList(raw.hardSkills || raw.skills || raw.technicalSkills)
      : inferSkills(text),
    softSkills: normalizeList(raw.softSkills).length ? normalizeList(raw.softSkills) : ["Communication"],
    goals: normalizeList(raw.goals || raw.developmentGoals || raw.interests).length
      ? normalizeList(raw.goals || raw.developmentGoals || raw.interests)
      : ["Improve team knowledge sharing"],
    painPoints: normalizeList(raw.painPoints || raw.challenges).length
      ? normalizeList(raw.painPoints || raw.challenges)
      : ["Need clearer sharing priorities"]
  };
}

function parsePlainTextProfiles(text) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const first = lines[0] || "";
      const [name, role] = first.split(/\s+[-–]\s+/);
      return {
        name: name || first,
        role,
        skills: lines.slice(1).join(", ")
      };
    });
}

export function formatImportedProfiles(input) {
  let records = input;
  if (typeof input === "string") {
    try {
      records = JSON.parse(input);
    } catch {
      records = parsePlainTextProfiles(input);
    }
  }

  const members = Array.isArray(records) ? records : records.members || records.profiles || [];
  return members.slice(0, 4).map((member, index) => normalizeMember(member, index));
}
