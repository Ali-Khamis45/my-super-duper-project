"use client";

import { AccessDenied } from "@/features/admin/components/AccessDenied";
import { AdminNav } from "@/features/admin/components/AdminNav";
import { useRequireManageProducts } from "@/features/admin/hooks/useRequireManageProducts";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const guardState = useRequireManageProducts();

  if (guardState === "checking" || guardState === "unauthenticated") {
    // "unauthenticated" redirects via the hook's own effect — this is the brief instant before
    // that navigation commits, not a dead end.
    return <div className="min-h-screen" aria-busy="true" aria-label="Checking access" />;
  }

  if (guardState === "forbidden") {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main id="main-content" className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        {children}
      </main>
    </div>
  );
}
