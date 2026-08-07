"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminInventoryFilter, InventoryStatusValue } from "@/lib/inventory-client";

interface InventoryFiltersProps {
  filter: AdminInventoryFilter;
  onChange: (next: AdminInventoryFilter) => void;
}

const STATUS_OPTIONS: Array<InventoryStatusValue | "all"> = ["all", "available", "low-stock", "out-of-stock"];

const STATUS_LABEL: Record<InventoryStatusValue | "all", string> = {
  all: "All statuses",
  available: "Available",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
};

/** Search matches the related ingredient's own code/name (`InventoryItemRepository.ApplyFilterAsync`'s real join against Catalog) — `InventoryItem` itself carries no display text of its own. */
export function InventoryFilters({ filter, onChange }: InventoryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor="inventory-search">Search</Label>
        <Input
          id="inventory-search"
          placeholder="Ingredient name or code…"
          value={filter.search ?? ""}
          onChange={(event) => onChange({ ...filter, search: event.target.value || undefined, page: 1 })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="inventory-status">Status</Label>
        <Select
          value={filter.status ?? "all"}
          onValueChange={(value) => onChange({ ...filter, status: !value || value === "all" ? undefined : (value as InventoryStatusValue), page: 1 })}
        >
          <SelectTrigger id="inventory-status" className="w-40">
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
