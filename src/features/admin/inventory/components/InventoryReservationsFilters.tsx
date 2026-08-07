"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryReservationsFilter, InventoryReservationStatusValue } from "@/lib/inventory-client";

interface InventoryReservationsFiltersProps {
  filter: InventoryReservationsFilter;
  onChange: (next: InventoryReservationsFilter) => void;
}

const STATUS_OPTIONS: Array<InventoryReservationStatusValue | "all"> = ["all", "active", "consumed", "released", "expired"];

export function InventoryReservationsFilters({ filter, onChange }: InventoryReservationsFiltersProps) {
  return (
    <div className="flex flex-col gap-1 sm:w-40">
      <Label htmlFor="reservation-status">Status</Label>
      <Select
        value={filter.status ?? "all"}
        onValueChange={(value) => onChange({ ...filter, status: !value || value === "all" ? undefined : (value as InventoryReservationStatusValue), page: 1 })}
      >
        <SelectTrigger id="reservation-status">
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
  );
}
