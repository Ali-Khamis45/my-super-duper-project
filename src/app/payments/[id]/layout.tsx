/**
 * Deliberately no auth guard — `GetPaymentReceiptQuery` enforces ownership-or-staff-or-guest-order
 * server-side (the same pattern `GetOrderQuery` already established), so a guest who just paid
 * can open their own receipt link with no login wall. See `(history)/layout.tsx`'s own doc
 * comment for why `/payments` itself is a sibling route group instead of a parent that would
 * otherwise cascade this page's own guard requirement onto this one too.
 */
export default function PaymentReceiptLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="main-content" className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
      {children}
    </div>
  );
}
