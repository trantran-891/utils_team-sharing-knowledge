import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const membersPath = path.resolve("data/members.json");

export const defaultMembers = [
  {
    id: "user_01",
    name: "Hải",
    email: "hai.demo@example.com",
    role: "Backend Developer",
    level: "Mid",
    hardSkills: ["Node.js", "API", "Database"],
    softSkills: ["Communication"],
    goals: ["System Design", "Reliable APIs"],
    painPoints: ["Need better architecture discussion"]
  },
  {
    id: "user_02",
    name: "An",
    email: "an.demo@example.com",
    role: "QA Engineer",
    level: "Mid",
    hardSkills: ["Test Design", "Automation", "Risk Analysis"],
    softSkills: ["Detail-oriented"],
    goals: ["Risk-based testing"],
    painPoints: ["Late requirement changes"]
  },
  {
    id: "user_03",
    name: "Minh",
    email: "minh.demo@example.com",
    role: "Frontend Developer",
    level: "Junior",
    hardSkills: ["HTML", "CSS", "JavaScript"],
    softSkills: ["Collaboration"],
    goals: ["Performance", "Maintainable UI"],
    painPoints: ["Unclear API contracts"]
  },
  {
    id: "user_04",
    name: "Lan",
    email: "lan.demo@example.com",
    role: "Business Analyst",
    level: "Senior",
    hardSkills: ["Requirements", "User Flows", "Stakeholder Mapping"],
    softSkills: ["Facilitation"],
    goals: ["Better acceptance criteria"],
    painPoints: ["Hard to align technical tradeoffs"]
  }
];

async function ensureFile() {
  await mkdir(path.dirname(membersPath), { recursive: true });
  try {
    await readFile(membersPath, "utf8");
  } catch {
    await writeFile(membersPath, `${JSON.stringify(defaultMembers, null, 2)}\n`);
  }
}

export async function readMembers() {
  await ensureFile();
  const members = JSON.parse(await readFile(membersPath, "utf8"));
  return members.map((member) => ({
    ...member,
    email: member.email || `${member.id}@example.com`
  }));
}

export async function writeMembers(members) {
  await mkdir(path.dirname(membersPath), { recursive: true });
  await writeFile(membersPath, `${JSON.stringify(members, null, 2)}\n`);
  return members;
}

export async function upsertMember(member) {
  const members = await readMembers();
  const index = members.findIndex((item) => item.id === member.id);
  if (index >= 0) {
    members[index] = { ...members[index], ...member };
  } else {
    members.push(member);
  }
  return writeMembers(members);
}
