import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const feedbackPath = path.resolve("data/comments.json");

async function ensureFeedback() {
  await mkdir(path.dirname(feedbackPath), { recursive: true });
  try {
    await readFile(feedbackPath, "utf8");
  } catch {
    await writeFile(feedbackPath, "[]\n");
  }
}

export async function readFeedback() {
  await ensureFeedback();
  return JSON.parse(await readFile(feedbackPath, "utf8"));
}

export async function addFeedback(feedback) {
  const items = await readFeedback();
  const saved = {
    userId: feedback.userId,
    topicId: feedback.topicId,
    rating: Number(feedback.rating || 5),
    comment: feedback.comment || "",
    createdAt: new Date().toISOString()
  };
  items.push(saved);
  await writeFile(feedbackPath, `${JSON.stringify(items, null, 2)}\n`);
  return saved;
}
