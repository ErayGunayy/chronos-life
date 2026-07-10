import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

// UI / body text — Inter (Chronos Design System). See CLAUDE.md §8.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Brand / display headings — Fraunces, a warm literary serif. Reintroduced
// (Session 25) to give the "stories before timelines" identity a journal feel
// that a neutral sans couldn't carry. See CLAUDE.md §8.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chronos",
  description: "Your life's second memory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
