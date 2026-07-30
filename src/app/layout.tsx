import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { SkipLink } from "@/components/layout/SkipLink";
import { Navbar } from "@/components/layout/navbar/Navbar";
import { AiBaristaLauncher } from "@/features/ai-barista/components/AiBaristaLauncher";
import { Providers } from "./providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

const siteName = "Coffeshop";
const description =
  "An interactive, premium coffee-shop experience — craft-first, motion-driven, built to be used, not just viewed.";

export const metadata: Metadata = {
  // Required for Next to resolve the file-convention OG/Twitter image
  // routes into absolute URLs. No production domain exists yet — falls
  // back to localhost rather than inventing one; set NEXT_PUBLIC_SITE_URL
  // once this ships somewhere real.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${siteName} — A Premium Coffee Experience`,
    template: `%s · ${siteName}`,
  },
  description,
  openGraph: {
    type: "website",
    siteName,
    title: `${siteName} — A Premium Coffee Experience`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — A Premium Coffee Experience`,
    description,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteName,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <SkipLink />
          <Navbar />
          {children}
          <AiBaristaLauncher />
        </Providers>
      </body>
    </html>
  );
}
