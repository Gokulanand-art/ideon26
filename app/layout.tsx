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
    default: `${config.eventName} · Register Online`,
    template: `%s · ${config.eventName}`,
  },
  description: `${config.eventName}: teams of 2–4, ₹${config.feePerHead}/participant, paid by UPI. Online registration open — ${config.onlineCapacity} participant seats. Live seat availability with instant confirmation.`,
  keywords: ["hackathon", "hackathon 2026", "register", "upcoming hackathon", "tech event"],
  openGraph: {
    title: `${config.eventName} · Register Online`,
    description: `Teams of 2–4 · ₹${config.feePerHead}/participant · UPI payment. Online registration is open, on-site registration is closed.`,
    type: "website",
    url: config.publicUrl,
    siteName: config.eventName,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: `${config.eventName} · Register Online` },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0f",
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