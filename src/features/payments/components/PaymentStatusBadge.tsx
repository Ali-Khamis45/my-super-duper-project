import { Badge } from "@/components/ui/badge";

/** Mirrors `Coffeshop.Domain.Payments.PaymentStatus` exactly, including the kebab-case multi-word members `PaymentMappingExtensions.ToApiString` produces on the wire (`PartiallyRefunded` → `"partially-refunded"`) — same "one status→label/variant map" discipline `OrderStatusBadge` already established for Ordering. */
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Succeeded",
  cancelled: "Cancelled",
  refunded: "Refunded",
  "partially-refunded": "Partially Refunded",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  processing: "secondary",
  succeeded: "default",
  cancelled: "outline",
  refunded: "secondary",
  "partially-refunded": "secondary",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
