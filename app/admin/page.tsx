import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdminDashboard } from "@/components/AdminDashboard";
import { getCurrentAdmin } from "@/lib/auth";
import { getStats } from "@/lib/stats";
import { listRegistrations, getTodayCount, getAdminSummary } from "@/lib/admin";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    // A shared link carries the access key; hand it to the route handler,
    // which is the only place able to set the session cookie.
    const { k } = await searchParams;
    redirect(k ? `/api/admin/key?k=${encodeURIComponent(k)}` : "/admin/login");
  }

  let stats = null;
  let list = null;
  let summary = null;
  let todayCount = 0;
  try {
    [stats, list, summary, todayCount] = await Promise.all([
      getStats(),
      listRegistrations({ page: 1, limit: 25 }),
      getAdminSummary(),
      getTodayCount(),
    ]);
  } catch (err) {
    console.error("admin dashboard load error", err);
  }

  return (
    <>
      <Navbar open={stats?.registrationOpen === true && !stats?.onlineFull} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="kicker">
                <span className="kicker-dot">●</span> Organizer console
              </p>
              <h1 className="display mt-2 text-3xl text-fg">ADMIN DASHBOARD</h1>
              <p className="mt-1 text-sm text-mut">
                {config.eventName} · {todayCount} registration{todayCount === 1 ? "" : "s"} today
              </p>
            </div>
          </div>

          <div className="mt-8">
            <AdminDashboard
              initialStats={stats}
              initialList={list}
              initialSummary={summary}
              adminUser={admin.u}
              feePerHead={config.feePerHead}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}