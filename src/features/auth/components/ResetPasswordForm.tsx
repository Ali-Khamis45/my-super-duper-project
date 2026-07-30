"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fadeUp } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ApiError, resetPassword } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const reducedMotion = usePrefersReducedMotion();

  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, newPassword);
      setSucceeded(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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
          {!token ? (
            <p className="text-destructive text-sm">This reset link is missing its token. Request a new one from the forgot-password page.</p>
          ) : succeeded ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="text-primary size-8" aria-hidden />
              <h1 className="font-display text-xl">Password updated</h1>
              <p className="text-muted-foreground text-sm">Every other session has been signed out for your security.</p>
              <Button render={<Link href="/login" />} nativeButton={false} className="mt-2">
                Log in
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h1 className="font-display text-xl">Choose a new password</h1>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="reset-password-new" className="text-sm font-medium">
                    New password
                  </label>
                  <Input
                    id="reset-password-new"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-destructive text-sm">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
                  {isSubmitting ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
