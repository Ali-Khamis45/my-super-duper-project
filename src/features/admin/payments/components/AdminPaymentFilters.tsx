"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminPaymentFilter } from "@/lib/payment-client";

interface AdminPaymentFiltersProps {
  filter: AdminPaymentFilter;
  onChange: (next: AdminPaymentFilter) => void;
}

/** Same option set as `PaymentStatusBadge`'s own map, kebab-case to match the wire format `AdminPaymentSearchQuery` parses (`.Replace("-", "")` server-side — see `PaymentEndpoints.AdminSearchPayments`'s own comment). */
const STATUS_OPTIONS = ["all", "pending", "processing", "succeeded", "cancelled", "refunded", "partially-refunded"] as const;

const STATUS_LABEL: Record<(typeof STATUS_OPTIONS)[number], string> = {
  all: "All statuses",
  pending: "Pending",
  processing: "Processing",
  succeeded: "Succeeded",
  cancelled: "Cancelled",
  refunded: "Refunded",
  "partially-refunded": "Partially Refunded",
};

/** Search matches what `PaymentRepository.GetPagedAsync` actually supports — a payment id or a real order number, never a partial-text match; see that method's own comment. */
export function AdminPaymentFilters({ filter, onChange }: AdminPaymentFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor="admin-payment-search">Search</Label>
        <Input
          id="admin-payment-search"
          placeholder="Payment ID or order number…"
          value={filter.search ?? ""}
          onChange={(event) => onChange({ ...filter, search: event.target.value || undefined, page: 1 })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="admin-payment-status">Status</Label>
        <Select
          value={filter.status ?? "all"}
          onValueChange={(value) => onChange({ ...filter, status: !value || value === "all" ? undefined : value, page: 1 })}
        >
          <SelectTrigger id="admin-payment-status" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {STATUS_LABEL[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
