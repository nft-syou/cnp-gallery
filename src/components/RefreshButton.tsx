"use client";
import { useState } from "react";

type State = "idle" | "loading" | "done" | "error";

const LABEL: Record<State, string> = {
  idle: "更新",
  loading: "更新中…",
  done: "更新しました",
  error: "更新に失敗",
};

// The refresh POST is synchronous: it does the fetch→diff→D1 update→revalidate
// and only then returns. So the button reflects real progress: loading while the
// request is in flight, done on success, error (re-enabled, so the user can
// retry) on failure.
export function RefreshButton({ tokenId }: { tokenId: number }) {
  const [state, setState] = useState<State>("idle");
  async function onClick() {
    setState("loading");
    try {
      const res = await fetch(`/api/tokens/${tokenId}/refresh`, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }
  // Disable while loading and after a successful update; keep enabled on error.
  const disabled = state === "loading" || state === "done";
  return (
    <button onClick={onClick} disabled={disabled}
      className="text-xs rounded-full border-2 border-pink-100 px-3 py-1 font-bold text-cnp-pink disabled:opacity-50">
      {LABEL[state]}
    </button>
  );
}
