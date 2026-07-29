"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export const navigationItems = [
  { label: "Menu", href: "/menu" },
  { label: "Customize", href: "/customize" },
  { label: "Concierge", href: "/concierge" },
  { label: "Our Story", href: "/story" },
] as const;

interface NavLinksProps {
  className?: string;
  onNavigate?: () => void;
}

export function NavLinks({ className, onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <ul className={cn("flex items-center gap-6", className)}>
      {navigationItems.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={pathname === item.href ? "page" : undefined}
            className="text-foreground/80 hover:text-foreground duration-(--duration-fast) text-sm font-medium transition-colors"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
