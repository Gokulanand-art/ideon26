"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatAmount } from "@/lib/upi";

export interface ConfirmationData {
  registration_id: string;
  name: string;
  registration_type: string;
  team_name: string | null;
  team_size: number;
  member_names: string[];
  status: string;
  created_at: string;
  amount: number;
  amount_display: string;
  fee_per_head: number;
  upi_id: string;
  payee_name: string;
  payment_status: string;
  txn_id: string | null;
  upi_intent_url: string;
  qr_data_url: string | null;
  token: string;
}

interface FreshData {
  status?: string;
  payment_status?: string;
  txn_id?: string | null;
}

export function ConfirmationPanel({ data }: { data: ConfirmationData }) {
  const [paymentStatus, setPaymentStatus] = useState(data.payment_status);
  const [regStatus, setRegStatus] = useState(data.status);
  const [txnId, setTxnId] = useState(data.txn_id ?? "");
  const [txnError, setTxnError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paidOpened, setPaidOpened] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/registration/${encodeURIComponent(data.registration_id)}?token=${encodeURIComponent(data.token)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const fresh = (await res.json()) as FreshData;
      setRegStatus((prev) => fresh.status ?? prev);
      setPaymentStatus((prev) => fresh.payment_status ?? prev);
      setTxnId((prev) => fresh.txn_id ?? prev);
    } catch {
      /* keep current state */
    }
  }, [data.registration_id, data.token]);

  useEffect(() => {
    const t = setInterval(() => {
      void refresh();
    }, 8_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function submitTxn(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setTxnError(null);
    try {
      const res = await fetch(
        `/api/registration/${encodeURIComponent(data.registration_id)}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txn_id: txnId.trim(), token: data.token }),
        },
      );
      const d = (await res.json().catch(() => ({}))) as { payment_status?: string; error?: string; fields?: Record<string, string> };
      if (!res.ok) {
        setTxnError(d.error ?? "Could not record the transaction ID. Please try again.");
        return;
      }
      setPaymentStatus(d.payment_status ?? "SUBMITTED");
      setPaidOpened(false);
    } catch {
      setTxnError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const confirmed = regStatus === "CONFIRMED";
  const cancelled = regStatus === "CANCELLED" || regStatus === "REJECTED";
  const paid = paymentStatus === "VERIFIED";
  const submitted = paymentStatus === "SUBMITTED";
  const failed = paymentStatus === "FAILED";

  const memberRows = data.member_names.map((n, i) => ({
    label: i === 0 ? "Team leader" : `Member ${i + 1}`,
    name: n,
  }));

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Status header */}
      <div
        className={`rounded-xl border px-6 py-6 text-center ${
          confirmed
            ? "border-signal/50 bg-signal/[0.08]"
            : cancelled
              ? "border-bad/40 bg-bad/10"
              : "border-warn/40 bg-warn/[0.06]"
        }`}
        role="status"
      >
        <p
          className={`font-mono text-xs font-bold tracking-[0.22em] ${
            confirmed ? "text-signal" : cancelled ? "text-bad" : "text-warn"
          }`}
        >
          {confirmed ? "● REGISTRATION CONFIRMED" : cancelled ? "● REGISTRATION " + regStatus : "● REGISTRATION SUBMITTED"}
        </p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-wide text-fg">
          {data.registration_id}
        </p>
        <p className="mt-1 text-xs text-mut">
          {confirmed
            ? data.registration_type === "ONLINE"
              ? "Your team is registered and your payment is verified."
              : "Your team is registered. The fee was collected at the venue."
            : cancelled
              ? "This registration is no longer active."
              : data.registration_type === "ONLINE"
                ? "Your seat is reserved while payment is being verified."
                : "Your seat is reserved — pay the fee at the venue."}
        </p>
      </div>

      {/* Confirmation details */}
      <dl className="panel mt-6 divide-y divide-line rounded-xl">
        <div className="flex items-center justify-between px-5 py-3.5">
          <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">REGISTRATION ID</dt>
          <dd className="font-mono text-sm font-bold text-fg">{data.registration_id}</dd>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">TEAM LEADER</dt>
          <dd className="text-sm font-medium text-fg">{data.name}</dd>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">TEAM SIZE</dt>
          <dd className="text-sm font-medium text-fg">
            {data.team_size} members
            {data.team_name ? ` · ${data.team_name}` : ""}
          </dd>
        </div>
        <div className="px-5 py-3.5">
          <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">MEMBERS</dt>
          <dd className="mt-2 space-y-1.5">
            {memberRows.map((m) => (
              <p key={m.label} className="flex items-center gap-2.5 text-sm text-fg">
                <span className="w-24 flex-none font-mono text-[10px] text-dim">{m.label.toUpperCase()}</span>
                {m.name}
              </p>
            ))}
          </dd>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">PARTICIPATION</dt>
          <dd>
            <span className={`chip ${data.registration_type === "ONLINE" ? "chip-open" : "chip-muted"}`}>
              {data.registration_type === "ONLINE" ? "ONLINE" : "ON-SITE"}
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">PAYMENT</dt>
          <dd className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-fg">{formatAmount(data.amount)}</span>
            {data.registration_type === "ONSITE" ? (
              <span className="chip chip-muted">PAY AT VENUE</span>
            ) : paid ? (
              <span className="chip chip-paid">PAID</span>
            ) : submitted ? (
              <span className="chip chip-pending">PENDING VERIFICATION</span>
            ) : failed ? (
              <span className="chip chip-closed">FAILED</span>
            ) : (
              <span className="chip chip-pending">UNPAID</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">REGISTERED</dt>
          <dd className="font-mono text-xs text-mut">
            {new Date(data.created_at).toLocaleString("en-IN")}
          </dd>
        </div>
      </dl>

      {/* Payment flow — online only, never shown for on-site */}
      {data.registration_type === "ONLINE" && !cancelled && (
        <div className="panel mt-6 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="display text-lg text-fg">PAYMENT</h2>
            <span className="font-mono text-sm font-bold text-signal">
              {formatAmount(data.amount)}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-mut">
            PAY TO · <span className="text-fg">{data.upi_id}</span> ({data.payee_name})
          </p>

          {paid ? (
            <div className="mt-5 rounded-lg border border-signal/40 bg-signal/[0.08] px-4 py-4 text-center">
              <p className="font-mono text-xs font-bold tracking-[0.16em] text-signal">
                ✓ PAYMENT PAID
              </p>
              <p className="mt-1.5 text-sm text-mut">
                {data.txn_id ? `UPI transaction ${data.txn_id} verified by an organizer.` : "Payment verified."}
              </p>
            </div>
          ) : submitted ? (
            <div className="mt-5 rounded-lg border border-warn/40 bg-warn/[0.07] px-4 py-4">
              <p className="font-mono text-xs font-bold tracking-[0.16em] text-warn">
                PAYMENT PENDING VERIFICATION
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-mut">
                Your UPI transaction ID was recorded. An organizer will verify
                it against their UPI app and confirm your registration shortly —
                your seat is held in the meantime. This page updates
                automatically.
              </p>
              {txnId && (
                <p className="mt-3 font-mono text-xs text-mut">
                  TXN ID · <span className="text-fg">{txnId}</span>
                </p>
              )}
              <button
                type="button"
                onClick={() => void refresh()}
                className="btn btn-ghost mt-4 px-4 py-2 text-xs"
              >
                Refresh status
              </button>
            </div>
          ) : failed ? (
            <div className="mt-5 rounded-lg border border-bad/40 bg-bad/10 px-4 py-4">
              <p className="font-mono text-xs font-bold tracking-[0.16em] text-bad">
                PAYMENT FAILED
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-mut">
                Payment was not confirmed. Please contact the organizers to
                retry.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <a
                    href={data.upi_intent_url}
                    className="btn btn-primary w-full px-6 py-4 text-[15px] font-bold tracking-wide"
                  >
                    PAY {formatAmount(data.amount)} NOW · OPENS YOUR UPI APP
                  </a>
                  <p className="mt-3 text-xs leading-relaxed text-dim">
                    Tapping the button opens your phone&apos;s UPI app with the
                    exact amount <span className="text-mut">₹{data.amount}</span> already
                    filled in — you only enter your UPI PIN and confirm. This
                    site never asks for your UPI PIN, OTP or bank password.
                  </p>
                </div>
                {data.qr_data_url && (
                  <div className="hidden flex-col items-center gap-1.5 sm:flex">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.qr_data_url}
                      alt={`QR code to pay ${formatAmount(data.amount)} via UPI to ${data.upi_id}`}
                      width={128}
                      height={128}
                      className="rounded-lg border border-line bg-white p-1.5"
                    />
                    <span className="font-mono text-[10px] text-dim">SCAN TO PAY</span>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-mut">
                  {paidOpened ? "ENTER THE UPI TRANSACTION ID" : "COMPLETED THE PAYMENT?"}
                </p>
                {!paidOpened ? (
                  <button
                    type="button"
                    onClick={() => setPaidOpened(true)}
                    className="btn btn-ghost mt-3 w-full px-5 py-3 text-sm"
                  >
                    I&apos;VE COMPLETED THE PAYMENT
                  </button>
                ) : (
                  <form onSubmit={submitTxn} className="mt-3">
                    <div className="flex flex-col gap-2.5 sm:flex-row">
                      <input
                        className="field flex-1 font-mono"
                        placeholder="UPI transaction ID (UTR)"
                        value={txnId}
                        onChange={(e) => {
                          setTxnId(e.target.value);
                          setTxnError(null);
                        }}
                        aria-label="UPI transaction ID"
                        aria-invalid={txnError ? true : undefined}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <button
                        type="submit"
                        disabled={submitting || txnId.trim().length < 6}
                        className="btn btn-primary px-6 py-2.5 text-sm font-bold"
                      >
                        {submitting ? "RECORDING…" : "SUBMIT FOR VERIFICATION"}
                      </button>
                    </div>
                    {txnError && (
                      <p role="alert" className="mt-2 text-xs text-[#f2a9a6]">
                        {txnError}
                      </p>
                    )}
                    <p className="mt-2.5 text-xs leading-relaxed text-dim">
                      The transaction ID is the 12-digit UTR shown in your UPI
                      app. Your registration stays pending until an organizer
                      verifies the payment.
                    </p>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/" className="btn btn-ghost px-6 py-2.5 text-sm">
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}