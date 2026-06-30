import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf5" },
    { media: "(prefers-color-scheme: dark)", color: "#14110b" },
  ],
};

// Inter is the CNP brand's Latin face (the official site pairs it with a
// Japanese stack). It carries the wordmark, headings and numerals; Japanese
// rides the fast system stack defined in globals.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const SITE = "https://cnp-gallery.syou.io";
const TITLE = "CNP Gallery — CryptoNinja Partners NFT ギャラリー";
const DESCRIPTION =
  "CryptoNinja Partners (CNP) の NFT を、トレイトとステータスで高速に絞り込み・検索できるギャラリー。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "CNP Gallery",
  keywords: ["CNP", "CryptoNinja Partners", "クリプトニンジャパートナーズ", "NFT", "ギャラリー", "忍術", "CryptoNinja"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "CNP Gallery",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE,
    locale: "ja_JP",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CNP Gallery" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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
    <html lang="ja" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* set the theme class before paint — no flash of the wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme:dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();",
          }}
        />
        {children}
        <footer className="mt-auto border-t border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-7 text-xs text-muted">
            <span className="font-display font-extrabold tracking-tight text-muted">CNP Gallery</span>
            <span className="tracking-wide">CryptoNinja Partners</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
