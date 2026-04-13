import { auth } from "@/auth";
import { extractPdf, ocrImageBuffer, pdfTextLooksWeak } from "@/lib/extract";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 15 * 1024 * 1024;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      texts: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 15MB)" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  const lower = file.name.toLowerCase();
  const isPdf = mime === "application/pdf" || lower.endsWith(".pdf");
  const isImage =
    mime.startsWith("image/") &&
    (mime === "image/png" ||
      mime === "image/jpeg" ||
      mime === "image/webp" ||
      mime === "image/gif");

  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Use a PDF or image (PNG, JPEG, WebP, GIF)" },
      { status: 400 },
    );
  }

  let storageKey: string;
  try {
    storageKey = await saveUpload(file.name, buf, mime);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to store file" }, { status: 500 });
  }

  const doc = await prisma.document.create({
    data: {
      userId: session.user.id,
      title: file.name,
      mimeType: mime,
      storageKey,
      status: "uploaded",
    },
  });

  try {
    if (isPdf) {
      const { text: rawText, numpages } = await extractPdf(buf);
      let text = rawText;
      if (pdfTextLooksWeak(rawText)) {
        text =
          "Note: Very little text was extracted — this may be a scanned PDF. Try uploading page images (PNG or JPEG) for OCR instead.\n\n---\n\n" +
          (rawText || "(no text extracted)");
      }
      await prisma.documentText.create({
        data: {
          documentId: doc.id,
          text,
          extractionMethod: "pdf_text",
          pageCount: numpages,
        },
      });
    } else {
      const text = await ocrImageBuffer(buf, mime);
      await prisma.documentText.create({
        data: {
          documentId: doc.id,
          text:
            text ||
            "No text recognized in this image. Try a clearer scan or higher resolution.",
          extractionMethod: "vision",
          pageCount: null,
        },
      });
    }

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "extracted" },
    });
  } catch (e) {
    console.error(e);
    await prisma.documentText.create({
      data: {
        documentId: doc.id,
        text: `Extraction failed: ${e instanceof Error ? e.message : "Unknown error"}`,
        extractionMethod: isPdf ? "pdf_text" : "vision",
        pageCount: null,
      },
    });
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "failed" },
    });
  }

  const updated = await prisma.document.findUnique({
    where: { id: doc.id },
    include: { texts: { orderBy: { version: "desc" }, take: 1 } },
  });

  return NextResponse.json(updated);
}
