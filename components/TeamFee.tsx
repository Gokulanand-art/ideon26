import { config } from "@/lib/config";

const FEE_ROWS = [
  { size: 2, label: "2 members", amount: config.feePerHead * 2 },
  { size: 3, label: "3 members", amount: config.feePerHead * 3 },
  { size: 4, label: "4 members", amount: config.feePerHead * 4 },
];

export function TeamFee() {
  return (
    <section id="team" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <p className="kicker">
            <span className="kicker-dot">●</span> Teams &amp; fees
          </p>
          <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">TEAM + FEE INFORMATION</h2>
          <p className="mt-4 text-sm leading-relaxed text-mut">
            Every registration is a team of 2–4. The entry fee is{" "}
            <span className="text-fg">₹{config.feePerHead} per participant</span> and is
            calculated automatically for your team size — the amount is
            computed on the server, never typed by hand.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-mut">
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-signal" aria-hidden="true" />
              Teams of 2, 3 or 4 members — no individual entries.
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-signal" aria-hidden="true" />
              The team leader registers for the whole team in one go.
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-signal" aria-hidden="true" />
              Payment is UPI only, to{" "}
              <span className="font-mono text-fg">{config.upiId}</span>.
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-signal" aria-hidden="true" />
              A seat is only locked once the payment is verified by an
              organizer.
            </li>
          </ul>
        </div>

        <div className="panel rounded-xl">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <span className="kicker">Team fee schedule</span>
            <span className="font-mono text-[11px] text-dim">₹{config.feePerHead} / HEAD</span>
          </div>
          <table className="w-full text-sm">
            <thead className="sr-only">
              <tr>
                <th scope="col">Team size</th>
                <th scope="col">Total fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {FEE_ROWS.map((r) => (
                <tr key={r.size}>
                  <td className="px-6 py-4 font-medium text-fg">{r.label}</td>
                  <td className="px-6 py-4 text-right font-mono text-lg font-bold text-fg">
                    ₹{r.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-line px-6 py-4">
            <span className="text-xs text-mut">Calculation</span>
            <span className="font-mono text-xs text-mut">
              team_size × ₹{config.feePerHead} — server-verified
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}