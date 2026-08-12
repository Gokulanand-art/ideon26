const STEPS = [
  { n: "01", title: "Register", desc: "Sign up online in under two minutes. Pick online or on-site." },
  { n: "02", title: "Form Your Team", desc: "Solo or up to six builders. Pick a bold problem." },
  { n: "03", title: "Build", desc: "24 hours of focused, creative building." },
  { n: "04", title: "Submit", desc: "Ship your project and demo it to the judges." },
  { n: "05", title: "Win", desc: "Take home prizes, swag and bragging rights." },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          How it works
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Five steps to glory.
        </h2>
      </div>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s) => (
          <li key={s.n} className="glass rounded-2xl p-5">
            <div className="font-mono text-3xl font-bold gradient-text">{s.n}</div>
            <div className="mt-3 text-base font-semibold text-white">{s.title}</div>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
