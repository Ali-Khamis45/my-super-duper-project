"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Additive navbar slot, per docs/33_AUTH_ARCHITECTURE.md — existing nav items
 * (`NavLinks`, `CartIcon`, `ThemeToggle`, ...) are untouched. `status === "idle" | "restoring"`
 * renders nothing rather than flashing a "Log in" link that then flips to a user menu a moment
 * later once the silent-refresh check resolves.
 */
export function AccountMenu() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (status === "idle" || status === "restoring") {
    return <div className="h-8 w-16" aria-hidden />;
  }

  if (status === "anonymous" || !user) {
    return (
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
        Log in
      </Button>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={`Account menu for ${user.fullName}`}>
            <User />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.fullName}</span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
