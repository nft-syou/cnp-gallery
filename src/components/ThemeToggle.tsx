"use client";
import { useCallback } from "react";

// Flips <html class="dark"> and remembers the choice. The initial class is set
// by an inline script in the layout (before paint) from localStorage/system, so
// there's no flash. Icons swap via CSS (the `dark:` variant), so this renders
// identically on server and client — no hydration mismatch.
export function ThemeToggle() {
  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="ライト / ダーク切り替え"
      title="ライト / ダーク切り替え"
      className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line-2 text-muted transition-colors hover:border-cnp-deep hover:bg-cnp/20 hover:text-ink sm:h-10 sm:w-10"
    >
      {/* moon — shown in light mode (tap → dark) */}
      <svg className="block h-[18px] w-[18px] dark:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      {/* sun — shown in dark mode (tap → light) */}
      <svg className="hidden h-[18px] w-[18px] dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    </button>
  );
}
