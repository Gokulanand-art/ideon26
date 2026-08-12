import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AdminDashboard } from "@/components/AdminDashboard";
import { getCurrentAdmin } from "@/lib/auth";
import { getStats } from "@/lib/stats";
import { listRegistrations, getTodayCount } from "@/lib/admin";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  let stats = null;
  let list = null;
  let todayCount = 0;
  try {
    [stats, list, todayCount] = await Promise.all([
      getStats(),
      listRegistrations({ page: 1, limit: 25 }),
      getTodayCount(),
    ]);
  } catch (err) {
    console.error("admin dashboard load error", err);
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {config.eventName} · {todayCount} registration{todayCount === 1 ? "" : "s"} today
              </p>
            </div>
          </div>

          <div className="mt-8">
            <AdminDashboard
              initialStats={stats}
              initialList={list}
              adminUser={admin.u}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
