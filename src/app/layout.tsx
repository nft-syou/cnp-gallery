import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter is the CNP brand's Latin face (the official site pairs it with a
// Japanese stack). It carries the wordmark, headings and numerals; Japanese
// rides the fast system stack defined in globals.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CNP Gallery",
  description:
    "CryptoNinja Partners (CNP) NFT ギャラリー — リビール済み 22,222 体を高速に閲覧・絞り込み",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <footer className="mt-auto border-t border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-7 text-xs text-faint">
            <span className="font-display font-extrabold tracking-tight text-muted">CNP Gallery</span>
            <span className="tracking-wide">22,222 revealed · CryptoNinja&nbsp;Partners</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
