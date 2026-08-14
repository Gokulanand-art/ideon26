import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { config } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const grotesk = Space_Grotesk({
  variable: "--font-gt",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${config.eventName} · ${config.eventType} — Register Online`,
    template: `%s · ${config.eventName}`,
  },
  description: `${config.eventName} — ${config.eventType}, organized by ${config.collegeName} (${config.departmentNames}). Teams of 2–4, ₹${config.feePerHead}/participant, paid by UPI (online) or at the venue (on-spot). Live slot availability with instant confirmation.`,
  keywords: ["hackathon", "hackathon 2026", "ideon", "ideon 26", "register", "tech event", "student hackathon"],
  openGraph: {
    title: `${config.eventName} · ${config.eventType} — Register Online`,
    description: `Teams of 2–4 · ₹${config.feePerHead}/participant · UPI payment (online) or pay at the venue (on-spot). Online & on-spot registration are open.`,
    type: "website",
    url: config.publicUrl,
    siteName: `${config.eventName} · ${config.eventType}`,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: `${config.eventName} · ${config.eventType} — Register Online` },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#05070e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${grotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}