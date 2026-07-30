"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminProductFilter } from "@/lib/product-client";

interface ProductFiltersProps {
  filter: AdminProductFilter;
  onChange: (next: AdminProductFilter) => void;
}

const STATUS_OPTIONS = ["all", "draft", "published", "archived"] as const;

export function ProductFilters({ filter, onChange }: ProductFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor="admin-product-search">Search</Label>
        <Input
          id="admin-product-search"
          placeholder="Search by name…"
          value={filter.search ?? ""}
          onChange={(event) => onChange({ ...filter, search: event.target.value || undefined, page: 1 })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="admin-product-status">Status</Label>
        <Select
          value={filter.status ?? "all"}
          onValueChange={(value) => onChange({ ...filter, status: !value || value === "all" ? undefined : (value as AdminProductFilter["status"]), page: 1 })}
        >
          <SelectTrigger id="admin-product-status" className="w-36">
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
