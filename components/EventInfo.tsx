import { config } from "@/lib/config";

/**
 * Event facts table — only verified information is shown. Date, time, venue,
 * prize and certificate come from the official brochure; any of them can be
 * blanked via its env var, in which case the row is dropped rather than shown
 * empty.
 */
export function EventInfo() {
  const items = [
    { label: "EVENT", value: config.eventName },
    { label: "TYPE", value: config.eventType },
    { label: "ORGANIZER", value: config.collegeName },
    { label: "DEPARTMENTS", value: config.departmentNames },
    { label: "DATE", value: config.eventDate },
    { label: "REPORTING TIME", value: config.eventTime },
    { label: "VENUE", value: config.eventVenue },
    { label: "CASH PRIZE", value: config.eventPrize },
    { label: "CERTIFICATE", value: config.eventCertificate },
    { label: "TEAM SIZE", value: "2–4 members" },
    { label: "FEE", value: `₹${config.feePerHead} per participant` },
    { label: "ONLINE CAPACITY", value: `${config.onlineCapacity} teams` },
    { label: "ON-SPOT CAPACITY", value: `${config.onsiteCapacity} teams` },
    { label: "TOTAL CAPACITY", value: `${config.totalCapacity} teams` },
  ].filter((it) => it.value && String(it.value).trim() !== "");

  return (
    <section id="info" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="kicker">
            <span className="kicker-dot">●</span> Event details
          </p>
          <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">EVENT INFORMATION</h2>
        </div>

        <dl className="panel mt-10 divide-y divide-line rounded-xl">
          {items.map((it) => (
            <div key={it.label} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <dt className="font-mono text-[11px] font-semibold tracking-[0.16em] text-dim">
                {it.label}
              </dt>
              <dd className="text-sm font-medium text-fg sm:text-right">{it.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}