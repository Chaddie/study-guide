import OpenAI from "openai";

export function getChatClient() {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY is not set");
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.x.ai/v1",
  });
}

export function chatModel() {
  return process.env.XAI_CHAT_MODEL ?? "grok-2-latest";
}

export function visionModel() {
  return process.env.XAI_VISION_MODEL ?? "grok-2-vision-latest";
}
