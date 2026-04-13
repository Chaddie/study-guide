"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useCallback, useState } from "react";

type ExplainMode = "plain" | "eli5" | "metaphor" | "exam";

const MODES: { id: ExplainMode; label: string }[] = [
  { id: "plain", label: "Plain" },
  { id: "eli5", label: "Like I’m 5" },
  { id: "metaphor", label: "Metaphors" },
  { id: "exam", label: "Exam prep" },
];

const VOICES = ["eve", "ara", "rex", "sal", "leo"] as const;

export function DocumentStudy({
  documentId,
  title,
  body,
}: {
  documentId: string;
  title: string;
  body: string;
}) {
  const [mode, setMode] = useState<ExplainMode>("plain");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [voice, setVoice] = useState<(typeof VOICES)[number]>("eve");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const getSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return null;
    const text = sel.toString().trim();
    if (!text) return null;
    return text;
  }, []);

  async function explain() {
    const selection = getSelection();
    if (!selection) {
      setErr("Select some text in the document first.");
      return;
    }
    setErr(null);
    setLoading(true);
    setExplanation(null);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection,
          context: body.slice(0, 12000),
          mode,
        }),
      });
      const j = (await res.json()) as { explanation?: string; error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Explain request failed");
        return;
      }
      setExplanation(j.explanation ?? "");
    } catch {
      setErr("Explain request failed");
    } finally {
      setLoading(false);
    }
  }

  async function speak(text: string) {
    if (!text.trim()) return;
    setTtsBusy(true);
    setErr(null);
    try {
      const chunks: string[] = [];
      const max = 12000;
      for (let i = 0; i < text.length; i += max) {
        chunks.push(text.slice(i, i + max));
      }
      for (const chunk of chunks) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunk, voice_id: voice, language: "en" }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setErr(j.error ?? "TTS failed");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("audio"));
          };
          void audio.play().catch(reject);
        });
      }
    } catch {
      setErr("Could not play audio");
    } finally {
      setTtsBusy(false);
    }
  }

  async function saveNote() {
    const selection = getSelection();
    if (!selection || !explanation) {
      setSaveMsg("Select text and run Explain first.");
      return;
    }
    setSaveMsg(null);
    const res = await fetch("/api/study-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId,
        selectionText: selection,
        modelOutput: explanation,
        mode,
      }),
    });
    if (!res.ok) {
      setSaveMsg("Save failed");
      return;
    }
    setSaveMsg("Saved to your notes.");
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <div className="flex-1 min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            ← Library
          </Link>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <div className="prose prose-zinc mt-4 max-w-none whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm selection:bg-indigo-200 dark:prose-invert dark:border-zinc-800 dark:bg-zinc-900 dark:selection:bg-indigo-900">
          {body}
        </div>
      </div>

      <aside className="w-full shrink-0 lg:w-80">
        <div className="sticky top-4 space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Explain selection
          </h2>
          <div className="flex flex-wrap gap-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  mode === m.id
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void explain()}
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Asking Grok…" : "Explain highlighted text"}
          </button>

          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <label className="text-xs font-medium text-zinc-500">Voice</label>
            <select
              value={voice}
              onChange={(e) =>
                setVoice(e.target.value as (typeof VOICES)[number])
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              {VOICES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={ttsBusy}
                onClick={() => {
                  const t = getSelection();
                  if (t) void speak(t);
                  else setErr("Select text to read aloud.");
                }}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium dark:border-zinc-600"
              >
                Read selection
              </button>
              <button
                type="button"
                disabled={ttsBusy || !explanation}
                onClick={() =>
                  explanation ? void speak(explanation) : undefined
                }
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium dark:border-zinc-600"
              >
                Read explanation
              </button>
            </div>
          </div>

          {explanation && (
            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
                <ReactMarkdown>{explanation}</ReactMarkdown>
              </div>
              <button
                type="button"
                onClick={() => void saveNote()}
                className="mt-3 w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Save note
              </button>
              {saveMsg && (
                <p className="mt-2 text-xs text-zinc-500">{saveMsg}</p>
              )}
            </div>
          )}

          {err && (
            <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
