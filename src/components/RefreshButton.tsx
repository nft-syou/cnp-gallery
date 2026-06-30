"use client";
import { useState } from "react";

type State = "idle" | "loading" | "done" | "error";

const LABEL: Record<State, string> = {
  idle: "更新", loading: "更新中", done: "更新済み", error: "再試行",
};
const STYLE: Record<State, string> = {
  idle: "border-line-2 text-muted hover:border-cnp-deep hover:bg-cnp/25 hover:text-ink",
  loading: "border-line text-muted",
  done: "border-mokuton/45 bg-mokuton/10 text-mokuton",
  error: "border-katon/50 bg-katon/[0.08] text-katon hover:bg-katon/15",
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
      className={`inline-flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-default ${STYLE[state]}`}>
      {state === "loading"
        ? <span aria-hidden className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
        : <span aria-hidden className="text-[13px] leading-none">{state === "done" ? "✓" : "↻"}</span>}
      {LABEL[state]}
    </button>
  );
}
