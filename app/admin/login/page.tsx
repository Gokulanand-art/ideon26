import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata: Metadata = { title: "Admin Login", robots: { index: false } };

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-xl">
              🔐
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Admin Sign In</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Authorized organizers only.
            </p>
          </div>
          <AdminLoginForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
