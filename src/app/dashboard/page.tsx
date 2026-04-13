"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

type DocRow = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  texts: { text: string }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (!res.ok) {
      setError("Could not load documents.");
      return;
    }
    const data = (await res.json()) as DocRow[];
    setDocs(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    const el = document.getElementById("upload-dropzone");
    const r = el?.getBoundingClientRect();
    // #region agent log
    const payload = {
      sessionId: "363ac6",
      hypothesisId: "H3-H4",
      location: "dashboard:mount",
      message: "dropzone layout",
      data: {
        dropzoneH: r?.height ?? -1,
        dropzoneW: r?.width ?? -1,
        path: typeof window !== "undefined" ? window.location.pathname : "",
      },
      timestamp: Date.now(),
    };
    fetch("http://127.0.0.1:7594/ingest/50ba8f3a-7b80-492f-9c80-f2e24990c5f7", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "363ac6",
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
    // #endregion
  }, []);

  async function onFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Upload failed");
        return;
      }
      const doc = (await res.json()) as { id: string };
      router.push(`/documents/${doc.id}`);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Upload a PDF or an image of notes. Extraction runs immediately (OCR for
        images uses Grok vision).
      </p>

      <label
        id="upload-dropzone"
        className="relative mt-8 flex min-h-[8rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-white px-6 py-12 transition hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-zinc-600 dark:bg-zinc-900/50 dark:hover:border-indigo-500"
      >
        <input
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          disabled={uploading}
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          aria-label="Upload PDF or image"
        />
        <span className="pointer-events-none text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {uploading ? "Uploading…" : "Drop or click to upload PDF / image"}
        </span>
        <span className="pointer-events-none mt-1 text-xs text-zinc-500">
          Max 15 MB
        </span>
      </label>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <ul className="mt-10 space-y-2">
        {docs === null && (
          <li className="text-sm text-zinc-500">Loading…</li>
        )}
        {docs?.length === 0 && (
          <li className="text-sm text-zinc-500">No documents yet.</li>
        )}
        {docs?.map((d) => (
          <li key={d.id}>
            <Link
              href={`/documents/${d.id}`}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-600"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {d.title}
              </span>
              <span className="text-xs uppercase text-zinc-500">
                {d.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
