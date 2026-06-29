import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

// Display face — an expressive high-contrast serif. Carries the wordmark,
// token names and the big numerals; the Japanese UI rides a fast system stack.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CNP Gallery — 墨と遁",
  description:
    "CryptoNinja Partners (CNP) NFT ギャラリー — リビール済み 22,222 体を高速に閲覧・絞り込み",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="mt-auto border-t border-line/70">
          <div className="max-w-6xl mx-auto px-5 py-7 flex items-baseline justify-between gap-4 text-xs text-faint">
            <span className="font-display italic text-muted">CNP Gallery</span>
            <span className="tracking-wide">
              22,222 revealed · CryptoNinja&nbsp;Partners
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
