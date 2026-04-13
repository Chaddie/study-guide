import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <p className="text-sm font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        Course companion
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Understand your materials faster
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        Upload a PDF or photo of notes. We extract text with OCR when needed, then
        you can ask Grok to explain selections in plain language, like you&apos;re
        five, or with metaphors — and listen with Grok text-to-speech.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-indigo-500"
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
