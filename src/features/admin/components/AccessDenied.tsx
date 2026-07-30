import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <ShieldAlertIcon className="text-muted-foreground size-8" aria-hidden="true" />
      <h1 className="font-display text-lg">You don&apos;t have access to this page.</h1>
      <p className="text-muted-foreground max-w-sm text-sm text-balance">Managing products requires an admin account. If this seems wrong, contact whoever manages the team.</p>
      <Button variant="outline" render={<Link href="/" />}>
        Back to the site
      </Button>
    </div>
  );
}
