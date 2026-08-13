/**
 * UPI payment helpers.
 *
 * buildUpiIntent generates a standard UPI deep link
 * (`upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...`) which opens the
 * phone's UPI app chooser with the amount already filled in — the payer only
 * enters their UPI PIN and confirms. `tn`/`tr` carry the registration id so
 * organisers can match the payment in their UPI app / bank statement.
 *
 * upiQrDataUrl renders the same URI as a QR code (scannable from any UPI app).
 */
import QRCode from "qrcode";

export function buildUpiIntent(opts: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}): string {
  const params = new URLSearchParams();
  params.set("pa", opts.upiId);
  params.set("pn", opts.payeeName);
  params.set("am", String(opts.amount));
  params.set("cu", "INR");
  if (opts.note) {
    params.set("tn", opts.note);
    params.set("tr", opts.note);
  }
  return `upi://pay?${params.toString()}`;
}

export async function upiQrDataUrl(intent: string): Promise<string> {
  return QRCode.toDataURL(intent, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 360,
  });
}

export function formatAmount(rupees: number): string {
  return `₹${Number(rupees).toLocaleString("en-IN")}`;
}