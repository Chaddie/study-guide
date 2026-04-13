import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { put } from "@vercel/blob";

/** Marker for Vercel: bytes stay in RAM for this request only (extraction uses the buffer). */
const MEMORY_PREFIX = "vercel:memory:";

function isRemoteKey(storageKey: string) {
  return storageKey.startsWith("http://") || storageKey.startsWith("https://");
}

function isMemoryKey(storageKey: string) {
  return storageKey.startsWith(MEMORY_PREFIX);
}

function localUploadDir() {
  return join(process.cwd(), "uploads");
}

/** True on Vercel deployments (serverless FS is not a durable writable project dir). */
function isVercel() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
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
      if (!isVercel()) throw e;
      // Invalid/expired token is common; on Vercel fall back so OCR still runs.
    }
  }

  if (isVercel()) {
    return `${MEMORY_PREFIX}${unique}`;
  }

  try {
    const uploadsDir = localUploadDir();
    await mkdir(uploadsDir, { recursive: true });
    const path = join(uploadsDir, unique);
    await writeFile(path, data);
    return unique;
  } catch (e) {
    console.error("[storage] filesystem upload failed, using memory key:", e);
    return `${MEMORY_PREFIX}${unique}`;
  }
}

export async function readUpload(storageKey: string): Promise<Buffer> {
  if (isRemoteKey(storageKey)) {
    const res = await fetch(storageKey);
    if (!res.ok) throw new Error(`Failed to fetch upload: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  if (isMemoryKey(storageKey)) {
    throw new Error(
      "Original file was not kept on the server; upload again to re-process.",
    );
  }

  return readFile(join(localUploadDir(), storageKey));
}
