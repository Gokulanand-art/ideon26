import { config } from "@/lib/config";

/**
 * About IDEON'26 — only verified facts: organizer, format, fee, capacity.
 * No invented dates, venues or prizes.
 */
export function About() {
  return (
    <section id="about" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="kicker">
              <span className="kicker-dot">●</span> About the event
            </p>
            <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">
              ABOUT IDEON&apos;26
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-mut">
              <span className="text-fg">{config.eventName}</span> —{" "}
              {config.eventType} — is organized by {config.collegeName}{" "}
              (Autonomous), through its {config.departmentNames}.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-mut">
              {config.eventDescription}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-mut">
              Teams of 2–4 build working prototypes across six domains — from
              AI &amp; intelligent systems to blockchain &amp; Web 3. Capacity
              is limited to {config.totalCapacity} participants, so seats are
              reserved strictly in the order registrations are verified.
            </p>
          </div>

          <div className="grid content-start gap-4 sm:grid-cols-2">
            {[
              { k: "INNOVATE", v: "Bring fresh ideas and build something new" },
              { k: "BUILD", v: "Ship working software, not just slide decks" },
              { k: "IMPACT", v: "Solve real problems across six track domains" },
            ].map((t) => (
              <div key={t.k} className="panel rounded-xl p-6">
                <p className="font-mono text-xs font-bold tracking-[0.18em] text-signal">
                  {t.k}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-mut">{t.v}</p>
              </div>
            ))}
            <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-6">
              <p className="font-mono text-xs font-bold tracking-[0.18em] text-gold">
                IDEON&apos;26
              </p>
              <p className="mt-2 text-sm leading-relaxed text-mut">
                The flagship student hackathon of the Department of CSBS &amp;
                AI/ML.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}