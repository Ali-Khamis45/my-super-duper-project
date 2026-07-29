"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface MenuSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function MenuSearch({ value, onChange }: MenuSearchProps) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden="true" />
      <label htmlFor="menu-search" className="sr-only">
        Search the menu
      </label>
      <Input
        id="menu-search"
        type="search"
        placeholder="Search drinks…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 pl-8"
      />
    </div>
  );
}
