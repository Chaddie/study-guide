import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const VOICES = new Set(["eve", "ara", "rex", "sal", "leo"]);

/** xAI TTS limit — chunk on client for longer passages */
const MAX_CHARS = 14_000;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.XAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text =
    typeof body === "object" && body !== null && "text" in body
      ? String((body as { text: unknown }).text ?? "")
      : "";
  const voiceRaw =
    typeof body === "object" && body !== null && "voice_id" in body
      ? String((body as { voice_id: unknown }).voice_id ?? "eve")
      : "eve";
  const language =
    typeof body === "object" && body !== null && "language" in body
      ? String((body as { language: unknown }).language ?? "en")
      : "en";

  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `Text too long (max ${MAX_CHARS} characters)` },
      { status: 400 },
    );
  }

  const voice_id = VOICES.has(voiceRaw) ? voiceRaw : "eve";

  const res = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.trim(),
      voice_id,
      language,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("TTS error", res.status, errText);
    return NextResponse.json(
      { error: "TTS request failed", detail: errText.slice(0, 200) },
      { status: 502 },
    );
  }

  const audio = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "audio/mpeg";

  return new NextResponse(audio, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
