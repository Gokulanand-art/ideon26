"use client";

import { useState } from "react";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Who can participate?",
    a: "Any student or aspiring builder. Whether you're a beginner or a seasoned hacker, you're welcome.",
  },
  {
    q: "Is registration free?",
    a: "Yes — registration is completely free for all participants.",
  },
  {
    q: "Can I participate online?",
    a: "Absolutely. We have 20 dedicated online seats. Select the Online mode on the registration form.",
  },
  {
    q: "How many seats are available?",
    a: "30 in total: 20 online and 10 on-site. Seats are allocated on a first-come, first-served basis.",
  },
  {
    q: "Can I change participation mode after registering?",
    a: "Mode changes depend on seat availability. Contact the organizers after registering if you need to switch.",
  },
  {
    q: "Can I register as an individual?",
    a: "Yes. Set your team size to 1 and use your name as the team name, or leave the team name blank.",
  },
  {
    q: "How will I receive confirmation?",
    a: "You'll see an instant confirmation page with a unique registration ID (e.g. HK26-0001). Save it for your records.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          FAQ
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Questions, answered.
        </h2>
      </div>
      <dl className="mt-10 divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.02]">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <dt>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-white transition-colors hover:bg-white/[0.03]"
                >
                  <span>{item.q}</span>
                  <span
                    className={`text-[var(--color-muted)] transition-transform ${isOpen ? "rotate-45" : ""}`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
              </dt>
              {isOpen && (
                <dd
                  id={`faq-panel-${i}`}
                  className="px-5 pb-5 text-sm leading-relaxed text-[var(--color-muted)]"
                >
                  {item.a}
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
