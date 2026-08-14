const DOMAINS = [
  {
    name: "AI & Intelligent Systems",
    desc: "Build intelligent systems that solve real-world problems.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 8v8M9 10.5v3M15 10.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "AI for Healthcare",
    desc: "Explore AI-powered solutions for healthcare and wellbeing.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21s-7-4.6-9.3-9A5.6 5.6 0 0 1 12 6.6 5.6 5.6 0 0 1 21.3 12C19 16.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 9.5v5M9.5 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "FinTech & Smart Banking",
    desc: "Innovate the future of finance, banking, and financial technology.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 8l9-5 9 5-9 5-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M6 10v6M10 10v6M14 10v6M18 10v6M3 17h18v3H3v-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "AI in Management",
    desc: "Use AI to improve decision-making, operations, and business strategy.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "AR/VR Metaverse",
    desc: "Create immersive experiences using AR, VR, and emerging digital environments.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7 13.5h2.5V16H7v-2.5zM14.5 13.5H17V16h-2.5v-2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Blockchain & Web 3",
    desc: "Explore decentralized applications, blockchain systems, and Web3 technologies.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 11l8-4.5M12 11L4 6.5M12 11v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Domains() {
  return (
    <section id="domains" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="kicker">
            <span className="kicker-dot">●</span> Build tracks
          </p>
          <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">DOMAINS</h2>
          <p className="mt-3 text-sm leading-relaxed text-mut">
            Six technology domains from the official IDEON&apos;26 brochure.
            Pick a track and build something that matters.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((d) => (
            <article
              key={d.name}
              className="group panel rounded-xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/40 hover:shadow-[0_18px_50px_-24px_rgba(56,189,248,0.35)]"
            >
              <div className="grid h-11 w-11 place-items-center rounded-lg border border-signal/30 bg-signal/[0.07] text-signal transition-colors group-hover:bg-signal/15">
                {d.icon}
              </div>
              <h3 className="display mt-5 text-lg text-fg">{d.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mut">{d.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}