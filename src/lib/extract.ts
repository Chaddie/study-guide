import { getChatClient, visionModel } from "@/lib/xai";

export async function extractPdf(buffer: Buffer): Promise<{
  text: string;
  numpages: number | null;
}> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return {
    text: (data.text ?? "").trim(),
    numpages: data.numpages ?? null,
  };
}

export async function ocrImageBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const client = getChatClient();

  const res = await client.chat.completions.create({
    model: visionModel(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Transcribe all visible text exactly. Preserve paragraph breaks and heading structure where obvious. Output only the transcript, no preamble or commentary.",
          },
          {
            type: "image_url",
            image_url: { url: dataUrl, detail: "high" },
          },
        ],
      },
    ],
  });

  return (res.choices[0]?.message?.content ?? "").trim();
}

/** Heuristic: likely scanned or empty PDF if very little text */
export function pdfTextLooksWeak(text: string, minChars = 80) {
  const t = text.replace(/\s+/g, "");
  return t.length < minChars;
}
