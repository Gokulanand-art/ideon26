import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: `${config.eventName} — Register Now`,
    template: `%s · ${config.eventName}`,
  },
  description:
    "Register now for " +
    config.eventName +
    ". 30 seats · 20 online + 10 on-site. Live seat availability, instant confirmation.",
  openGraph: {
    title: `${config.eventName} — Register Now`,
    description:
      "A challenge for builders, creators and problem solvers. 30 seats · 20 online + 10 on-site.",
    type: "website",
    url: config.publicUrl,
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
