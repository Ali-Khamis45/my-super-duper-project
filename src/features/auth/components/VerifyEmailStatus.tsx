"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError, verifyEmail } from "@/lib/auth-client";

type Status = "verifying" | "success" | "error";

export function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string | null>(null);
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!token) return; // Rendered directly below — no async call, nothing to guard against StrictMode's double-invocation.
    if (hasAttempted.current) return; // StrictMode double-invocation guard — a verification token is single-use.
    hasAttempted.current = true;

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        {!token && (
          <>
            <AlertCircle className="text-destructive size-8" aria-hidden />
            <h1 className="font-display text-xl">Verification failed</h1>
            <p className="text-muted-foreground text-sm">This verification link is missing its token.</p>
          </>
        )}
        {token && status === "verifying" && (
          <>
            <Loader2 className="text-primary size-8 animate-spin" aria-hidden />
            <p className="text-muted-foreground text-sm">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="text-primary size-8" aria-hidden />
            <h1 className="font-display text-xl">Email verified</h1>
            <p className="text-muted-foreground text-sm">You can now log in to your account.</p>
            <Button render={<Link href="/login" />} nativeButton={false} className="mt-2">
              Go to login
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="text-destructive size-8" aria-hidden />
            <h1 className="font-display text-xl">Verification failed</h1>
            <p className="text-muted-foreground text-sm">{message}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
