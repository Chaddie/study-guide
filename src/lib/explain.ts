import { getChatClient, chatModel } from "@/lib/xai";

export type ExplainMode = "plain" | "eli5" | "metaphor" | "exam";

const MODE_INSTRUCTION: Record<ExplainMode, string> = {
  plain:
    "Explain clearly and accurately. Define jargon briefly when it appears. Stay scoped to the excerpt.",
  eli5:
    "Explain in very simple language and short sentences, suitable for a young learner. Avoid being condescending. Stay scoped to the excerpt.",
  metaphor:
    "Explain using one to three vivid analogies or metaphors that clarify the ideas. Also give a short plain summary. Stay scoped to the excerpt.",
  exam:
    "Summarize as exam-ready bullet points: definitions, key claims, and common pitfalls. Stay scoped to the excerpt.",
};

export async function explainSelection(
  selection: string,
  surroundingContext: string | undefined,
  mode: ExplainMode,
): Promise<string> {
  const client = getChatClient();
  const sys = `You help students understand course material. ${MODE_INSTRUCTION[mode]}

Rules:
- Do not invent facts or citations.
- If the excerpt is ambiguous or incomplete, say what is missing.
- Use markdown with short headings where helpful.`;

  const userParts = [
    `Excerpt to explain:\n"""${selection}"""`,
    surroundingContext
      ? `Optional surrounding context (for reference only):\n"""${surroundingContext.slice(0, 8000)}"""`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await client.chat.completions.create({
    model: chatModel(),
    messages: [
      { role: "system", content: sys },
      { role: "user", content: userParts },
    ],
  });

  return (res.choices[0]?.message?.content ?? "").trim();
}
