import { config } from "@/lib/config";

const FAQS = [
  {
    q: "Can I register as an individual?",
    a: "No — every registration is a team of 2–4 members. The team leader registers once for the whole team.",
  },
  {
    q: "What does registration cost?",
    a: `₹${config.feePerHead} per participant, calculated automatically: 2 members = ₹${config.feePerHead * 2}, 3 members = ₹${config.feePerHead * 3}, 4 members = ₹${config.feePerHead * 4}. The amount is computed on the server — you never type it.`,
  },
  {
    q: "How do I pay?",
    a: "By UPI. The payment screen shows the exact amount with a Pay button and QR code; you complete the payment inside your own UPI app.",
  },
  {
    q: "How is my payment verified?",
    a: "After paying, submit the UPI transaction ID shown in your UPI app. An organizer verifies it and confirms your registration — your seat is held in the meantime.",
  },
  {
    q: "Is on-spot registration available?",
    a: "Yes — on-spot registration works exactly like online, except the fee is paid at the venue when you arrive. No online payment.",
  },
  {
    q: "When does registration close?",
    a: `When all ${config.onlineCapacity} online and ${config.onsiteCapacity} on-spot participant seats are filled. Watch the live status on this page for the current counts.`,
  },
  {
    q: "Can I change my team size or members after registering?",
    a: "No — the team and its size are fixed at registration. The capacity check reserves the whole team, so pick your final lineup before paying.",
  },
  {
    q: "Do you ever ask for my UPI PIN, OTP or bank password?",
    a: "Never. This website only launches the UPI payment request. Authentication happens entirely inside your UPI app.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <p className="kicker">
          <span className="kicker-dot">●</span> Answers
        </p>
        <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">FREQUENTLY ASKED QUESTIONS</h2>

        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQS.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-2 py-5 text-[15px] font-medium text-fg marker:hidden hover:text-signal">
                {f.q}
                <span
                  className="grid h-6 w-6 flex-none place-items-center rounded-md border border-line-strong text-mut transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="px-2 pb-5 text-sm leading-relaxed text-mut">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}