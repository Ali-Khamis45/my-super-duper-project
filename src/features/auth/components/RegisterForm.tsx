"use client";

import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fadeUp } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ApiError } from "@/lib/auth-client";
import { useAuthStore } from "@/stores/auth-store";

export function RegisterForm() {
  const register = useAuthStore((state) => state.register);
  const reducedMotion = usePrefersReducedMotion();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const user = await register(email, password, fullName);
      setRegisteredEmail(user.email);
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors ?? {});
        if (!err.fieldErrors) setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <motion.div
        initial={reducedMotion ? false : "hidden"}
        animate={reducedMotion ? undefined : "visible"}
        variants={fadeUp}
        className="mx-auto w-full max-w-sm"
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <MailCheck className="text-primary size-8" aria-hidden />
            <h1 className="font-display text-xl">Check your email</h1>
            <p className="text-muted-foreground text-sm">
              We sent a verification link to <span className="text-foreground font-medium">{registeredEmail}</span>. Verify your
              address, then log in.
            </p>
            <Button render={<Link href="/login" />} nativeButton={false} className="mt-2">
              Go to login
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
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
            <h1 className="font-display text-xl">Create your account</h1>
            <p className="text-muted-foreground text-sm">Real orders, saved favorites, order history — all coming online this milestone.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="register-fullname" className="text-sm font-medium">
                Full name
              </label>
              <Input id="register-fullname" required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              {fieldErrors.FullName?.map((message) => (
                <span key={message} className="text-destructive text-xs">
                  {message}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="register-email" className="text-sm font-medium">
                Email
              </label>
              <Input id="register-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              {fieldErrors.Email?.map((message) => (
                <span key={message} className="text-destructive text-xs">
                  {message}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="register-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="register-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {fieldErrors.Password?.map((message) => (
                <span key={message} className="text-destructive text-xs">
                  {message}
                </span>
              ))}
            </div>

            {formError && (
              <p role="alert" className="text-destructive text-sm">
                {formError}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
