import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { put } from "@vercel/blob";

function isRemoteKey(storageKey: string) {
  return storageKey.startsWith("http://") || storageKey.startsWith("https://");
}

export async function saveUpload(
  originalName: string,
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}-${safeName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(unique, data, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType || "application/octet-stream",
    });
    return blob.url;
  }

  const uploadsDir = join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const path = join(uploadsDir, unique);
  await writeFile(path, data);
  return unique;
}

export async function readUpload(storageKey: string): Promise<Buffer> {
  if (isRemoteKey(storageKey)) {
    const res = await fetch(storageKey);
    if (!res.ok) throw new Error(`Failed to fetch upload: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(process.cwd(), "uploads", storageKey));
}
