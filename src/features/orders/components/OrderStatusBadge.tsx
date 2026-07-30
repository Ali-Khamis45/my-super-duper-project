import { Badge } from "@/components/ui/badge";

/** Mirrors `Coffeshop.Domain.Ordering.OrderStatus` exactly (`Order.ToString().ToLowerInvariant()` on the wire) — shared by the customer-facing Order Details/My Orders pages and the admin Orders table, one status→label/variant mapping, not two. */
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  paid: "Paid",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  submitted: "secondary",
  paid: "secondary",
  completed: "default",
  cancelled: "outline",
  failed: "destructive",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
