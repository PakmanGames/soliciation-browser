import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/app/providers";

import "./globals.css";

// `--font-sans` is the variable the shadcn theme in globals.css reads.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solicitation Browser",
  description: "Browse, search, and filter daily DIBBS RFQs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions often stamp attributes on <html> before React hydrates; this
    // ignores attribute mismatches on this one element only, not on its children.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
