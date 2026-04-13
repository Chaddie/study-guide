import { auth } from "@/auth";
import {
  explainSelection,
  type ExplainMode,
} from "@/lib/explain";
import { NextRequest, NextResponse } from "next/server";

const MODES: ExplainMode[] = ["plain", "eli5", "metaphor", "exam"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const selection =
    typeof body === "object" && body !== null && "selection" in body
      ? String((body as { selection: unknown }).selection ?? "")
      : "";
  const modeRaw =
    typeof body === "object" && body !== null && "mode" in body
      ? String((body as { mode: unknown }).mode ?? "plain")
      : "plain";
  const context =
    typeof body === "object" && body !== null && "context" in body
      ? String((body as { context: unknown }).context ?? "")
      : undefined;

  if (!selection.trim()) {
    return NextResponse.json({ error: "selection is required" }, { status: 400 });
  }

  const mode = MODES.includes(modeRaw as ExplainMode)
    ? (modeRaw as ExplainMode)
    : "plain";

  try {
    const explanation = await explainSelection(
      selection,
      context?.trim() || undefined,
      mode,
    );
    return NextResponse.json({ explanation, mode });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Explain failed" },
      { status: 502 },
    );
  }
}
