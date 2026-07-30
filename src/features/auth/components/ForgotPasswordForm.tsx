"use client";

import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fadeUp } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { forgotPassword } from "@/lib/auth-client";

/** Always shows the same success state regardless of whether the email exists — per docs/33_AUTH_ARCHITECTURE.md, the backend itself never reveals account existence, and the frontend must not undo that by branching on the response. */
export function ForgotPasswordForm() {
  const reducedMotion = usePrefersReducedMotion();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
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
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <MailCheck className="text-primary size-8" aria-hidden />
              <h1 className="font-display text-xl">Check your email</h1>
              <p className="text-muted-foreground text-sm">
                If an account exists for <span className="text-foreground font-medium">{email}</span>, a reset link is on its way.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h1 className="font-display text-xl">Reset your password</h1>
                <p className="text-muted-foreground text-sm">We&rsquo;ll email you a link to choose a new one.</p>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="forgot-password-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="forgot-password-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
                  {isSubmitting ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
