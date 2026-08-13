import Link from "next/link";
import { config } from "@/lib/config";

const STEPS = [
  {
    n: "01",
    title: "Pick your team",
    body: "Teams of 2–4 members. There are no individual registrations — bring at least one teammate.",
  },
  {
    n: "02",
    title: "Team leader details",
    body: "Enter the team leader's name and email. The leader is member 1 and the main contact.",
  },
  {
    n: "03",
    title: "Add team members",
    body: "Names only — no emails, no extra paperwork. Fields are generated for your team size.",
  },
  {
    n: "04",
    title: "Pay the team fee with UPI",
    body: `The fee is automatic: ₹${config.feePerHead} × team size. Pay the exact amount via UPI to ${config.upiId}.`,
  },
  {
    n: "05",
    title: "Payment verified, seat locked",
    body: "Submit your UPI transaction ID. An organizer verifies it against their UPI app and confirms your registration.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="kicker">
            <span className="kicker-dot">●</span> Process
          </p>
          <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">
            HOW REGISTRATION WORKS
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-mut">
            A single flow from team details to a verified, confirmed seat.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.n} className="panel relative rounded-xl p-5">
              <span className="font-mono text-xs font-bold tracking-[0.2em] text-signal">
                {s.n}
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-fg">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-mut">{s.body}</p>
              {i < STEPS.length - 1 && (
                <svg
                  className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-line-strong lg:block"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ol>

        <p className="mt-8">
          <Link href="/register" className="font-mono text-xs font-semibold tracking-[0.14em] text-signal hover:text-fg">
            START REGISTRATION →
          </Link>
        </p>
      </div>
    </section>
  );
}