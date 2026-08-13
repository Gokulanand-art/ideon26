import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata: Metadata = { title: "Admin Login", robots: { index: false } };

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <>
      <Navbar open={false} />
      <main className="flex-1">
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-line-strong bg-panel text-mut">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="4" y="9" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </span>
            <p className="kicker mt-5">
              <span className="kicker-dot">●</span> Restricted area
            </p>
            <h1 className="display mt-2 text-3xl text-fg">ORGANIZER SIGN IN</h1>
            <p className="mt-2 text-sm text-mut">Authorized organizers only.</p>
          </div>
          <AdminLoginForm />
        </div>
      </main>
      <Footer />
    </>
  );
}