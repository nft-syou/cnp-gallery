"use client";
import { useState } from "react";

type State = "idle" | "loading" | "done" | "error";

const LABEL: Record<State, string> = {
  idle: "更新", loading: "更新中", done: "更新済み", error: "再試行",
};
const STYLE: Record<State, string> = {
  idle: "border-line-2 text-muted hover:border-shu hover:text-shu-soft",
  loading: "border-line text-faint",
  done: "border-mokuton/45 text-mokuton",
  error: "border-shu/55 text-shu-soft hover:border-shu",
};

// The refresh POST is synchronous: it does the fetch→diff→D1 update→revalidate
// and only then returns. The button reflects real progress — loading while in
// flight, done on success, error (re-enabled, so the user can retry) on failure.
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
  const disabled = state === "loading" || state === "done";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${STYLE[state]}`}>
      {state === "loading"
        ? <span aria-hidden className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
        : <span aria-hidden className="text-[13px] leading-none">{state === "done" ? "✓" : "↻"}</span>}
      {LABEL[state]}
    </button>
  );
}
