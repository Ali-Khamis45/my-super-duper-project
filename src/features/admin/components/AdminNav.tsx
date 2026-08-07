"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/ingredients", label: "Ingredients" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/inventory", label: "Inventory" },
];

/** A deliberately plainer chrome than the public `Navbar` — an internal tool, not a marketing surface, per the same distinction most real admin panels draw. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-border bg-background/95 fixed inset-x-0 top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-display text-sm font-semibold">Admin</span>
          <nav aria-label="Admin" className="flex items-center gap-1">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline">
          View site
        </Link>
      </div>
    </header>
  );
}
