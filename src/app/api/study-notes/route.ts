import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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
    typeof body === "object" && body !== null && "selectionText" in body
      ? String((body as { selectionText: unknown }).selectionText ?? "")
      : "";
  const modelOutput =
    typeof body === "object" && body !== null && "modelOutput" in body
      ? String((body as { modelOutput: unknown }).modelOutput ?? "")
      : "";
  const mode =
    typeof body === "object" && body !== null && "mode" in body
      ? String((body as { mode: unknown }).mode ?? "plain")
      : "plain";
  const rawDocId =
    typeof body === "object" && body !== null && "documentId" in body
      ? (body as { documentId: unknown }).documentId
      : null;
  const documentId =
    typeof rawDocId === "string" && rawDocId.trim() ? rawDocId.trim() : null;

  if (!selection.trim() || !modelOutput.trim()) {
    return NextResponse.json(
      { error: "selectionText and modelOutput are required" },
      { status: 400 },
    );
  }

  if (documentId) {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId: session.user.id },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
  }

  const note = await prisma.studyNote.create({
    data: {
      userId: session.user.id,
      documentId: documentId || null,
      selectionText: selection,
      mode,
      modelOutput,
    },
  });

  return NextResponse.json(note);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notes = await prisma.studyNote.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notes);
}
