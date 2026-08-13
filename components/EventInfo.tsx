import { config } from "@/lib/config";

const ITEMS = [
  { label: "EVENT", value: config.eventName },
  { label: "DATE", value: config.eventDate },
  { label: "DURATION", value: config.eventDuration },
  { label: "VENUE", value: config.eventVenue },
  { label: "PRIZES", value: config.eventPrize },
];

export function EventInfo() {
  return (
    <section id="about" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <p className="kicker">
            <span className="kicker-dot">●</span> About the event
          </p>
          <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">
            {config.eventName.toUpperCase()}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-mut">{config.eventDescription}</p>
        </div>

        <dl className="panel divide-y divide-line self-start rounded-xl">
          {ITEMS.map((it) => (
            <div key={it.label} className="flex items-baseline justify-between gap-6 px-6 py-4">
              <dt className="font-mono text-[11px] font-semibold tracking-[0.16em] text-dim">
                {it.label}
              </dt>
              <dd className="text-right text-sm font-medium text-fg">{it.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}