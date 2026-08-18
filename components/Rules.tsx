import { rules } from "@/lib/config";

/**
 * Competition rules from the official brochure. Distinct from the FAQ, which
 * covers registration mechanics — these govern what a team has to do on the
 * day. Renders nothing when no rules are configured.
 */
export function Rules() {
  if (rules.length === 0) return null;

  return (
    <section id="rules" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="kicker">
            <span className="kicker-dot">●</span> What is expected
          </p>
          <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">RULES</h2>
          <p className="mt-4 text-sm leading-relaxed text-mut">
            Read these before you register — they apply to every team, online and on-spot.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          {rules.map((rule, i) => (
            <li
              key={rule}
              className="panel flex flex-col gap-3 rounded-xl px-6 py-5"
            >
              <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-signal">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm leading-relaxed text-fg">{rule}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
