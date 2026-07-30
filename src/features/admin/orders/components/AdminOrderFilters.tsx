"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminOrderFilter } from "@/lib/order-client";

interface AdminOrderFiltersProps {
  filter: AdminOrderFilter;
  onChange: (next: AdminOrderFilter) => void;
}

const STATUS_OPTIONS = ["all", "draft", "submitted", "paid", "completed", "cancelled", "failed"] as const;

/** Search matches exactly what `OrderRepository.ApplyFilter` actually supports — a real order number (exact match) or a guest name/email fragment; see that method's own comment for why it isn't a uniform partial-match search. */
export function AdminOrderFilters({ filter, onChange }: AdminOrderFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor="admin-order-search">Search</Label>
        <Input
          id="admin-order-search"
          placeholder="Order number or guest name/email…"
          value={filter.search ?? ""}
          onChange={(event) => onChange({ ...filter, search: event.target.value || undefined, page: 1 })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="admin-order-status">Status</Label>
        <Select
          value={filter.status ?? "all"}
          onValueChange={(value) => onChange({ ...filter, status: !value || value === "all" ? undefined : value, page: 1 })}
        >
          <SelectTrigger id="admin-order-status" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "all" ? "All statuses" : option[0]!.toUpperCase() + option.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
