import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { put } from "@vercel/blob";

function isRemoteKey(storageKey: string) {
  return storageKey.startsWith("http://") || storageKey.startsWith("https://");
}

/** Writable uploads dir on Vercel serverless when Blob is not configured. */
function vercelTempUploadDir() {
  return join(tmpdir(), "study-guide-uploads");
}

function localUploadDir() {
  return join(process.cwd(), "uploads");
}

export async function saveUpload(
  originalName: string,
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}-${safeName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(unique, data, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: mimeType || "application/octet-stream",
      });
      return blob.url;
    } catch (e) {
      console.error("[storage] Vercel Blob put failed:", e);
      throw e;
    }
  }

  // Vercel: project dir is not writable; only /tmp is (and Blob above).
  if (process.env.VERCEL) {
    const dir = vercelTempUploadDir();
    await mkdir(dir, { recursive: true });
    const path = join(dir, unique);
    await writeFile(path, data);
    return unique;
  }

  const uploadsDir = localUploadDir();
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

  if (process.env.VERCEL && !isRemoteKey(storageKey)) {
    const path = join(vercelTempUploadDir(), storageKey);
    return readFile(path);
  }

  return readFile(join(localUploadDir(), storageKey));
}
