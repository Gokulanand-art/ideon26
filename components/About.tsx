import { config } from "@/lib/config";

export function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            About the hackathon
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Build something extraordinary.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
            {config.eventDescription}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoCard label="Duration" value={config.eventDuration} icon="⏱️" />
          <InfoCard label="Date" value={config.eventDate} icon="📅" />
          <InfoCard label="Venue" value={config.eventVenue} icon="📍" />
          <InfoCard label="Prizes" value={config.eventPrize} icon="🏆" />
        </div>
      </div>
    </section>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-2xl" aria-hidden="true">{icon}</div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
