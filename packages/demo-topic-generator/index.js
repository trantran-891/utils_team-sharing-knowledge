import { generateTopicsWithAi } from "../demo-ai-runner/index.js";
import { readMembers } from "../demo-profile/memberStore.js";
import { readSettings } from "../demo-settings/settingsStore.js";
import { saveGeneratedTopics } from "./topicStore.js";

export async function generateWeeklyTopics() {
  const [settings, members] = await Promise.all([readSettings(), readMembers()]);
  const topics = await generateTopicsWithAi({ settings, members });
  return saveGeneratedTopics(topics);
}
