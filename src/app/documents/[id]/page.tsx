import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { DocumentStudy } from "./DocumentStudy";

type Params = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const doc = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
    include: {
      texts: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  if (!doc) {
    notFound();
  }

  const text = doc.texts[0]?.text ?? "(No text yet.)";

  return (
    <DocumentStudy documentId={doc.id} title={doc.title} body={text} />
  );
}
