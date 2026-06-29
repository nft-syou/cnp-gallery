"use client";
import { useState } from "react";

export function RefreshButton({ tokenId }: { tokenId: number }) {
  const [state, setState] = useState<"idle" | "sent">("idle");
  async function onClick() {
    const res = await fetch(`/api/tokens/${tokenId}/refresh`, { method: "POST" });
    if (res.ok) setState("sent");
  }
  return (
    <button onClick={onClick} disabled={state === "sent"}
      className="text-xs rounded-full border-2 border-pink-100 px-3 py-1 font-bold text-cnp-pink disabled:opacity-50">
      {state === "sent" ? "更新リクエスト受付済み" : "更新"}
    </button>
  );
}
