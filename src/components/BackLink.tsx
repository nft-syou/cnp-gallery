"use client";
import Link from "next/link";
import { useCallback } from "react";

// "ギャラリーへ戻る". Filters live entirely in the gallery URL's query string, so
// a plain navigation to "/" would drop them. When the visitor reached this page
// by navigating from the gallery (there's history to pop), go back instead —
// that restores the exact filtered view *and* the scroll position. Visitors who
// landed directly (shared link, history length 1) fall through to the bare
// gallery URL via the Link's href.
export function BackLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const onClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  }, []);

  return (
    <Link href="/" onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
