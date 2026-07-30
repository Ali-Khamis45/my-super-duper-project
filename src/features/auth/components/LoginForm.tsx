"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fadeUp } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useAuthStore } from "@/stores/auth-store";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const reducedMotion = usePrefersReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password, typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 100) : undefined);
      router.push("/");
    } catch {
      // Error surfaced via the store's `error` field below — nothing further to do here.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      variants={fadeUp}
      className="mx-auto w-full max-w-sm"
    >
      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-xl">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Log in to your Coffeshop account.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="login-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearError();
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="login-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearError();
                }}
              />
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-sm">
            No account yet?{" "}
            <Link href="/register" className="text-foreground underline-offset-4 hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
