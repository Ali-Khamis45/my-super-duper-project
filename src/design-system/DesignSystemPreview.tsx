import { Bell, ChevronDown, Coffee } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GlassSurface } from "@/design-system/primitives/GlassSurface";
import { GlowCard } from "@/design-system/primitives/GlowCard";
import { ThemeToggle } from "@/design-system/theme/ThemeToggle";
import { brandAccent, cream, espresso, type OklchColor } from "@/design-system/tokens/colors";

function toOklch([l, c, h]: OklchColor) {
  return `oklch(${l} ${c} ${h})`;
}

function Swatch({ name, ramp }: { name: string; ramp: Record<number, OklchColor> }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm font-medium capitalize">{name}</p>
      <div className="flex overflow-hidden rounded-lg border">
        {Object.entries(ramp).map(([step, value]) => (
          <div
            key={step}
            className="flex h-16 flex-1 items-end justify-center pb-1"
            style={{ backgroundColor: toOklch(value) }}
          >
            <span className="text-[10px] font-mono text-white/70 mix-blend-difference">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-6 border-t py-16 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <h2 className="font-display text-2xl">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function DesignSystemPreview() {
  return (
    <div className="mx-auto max-w-4xl px-6 pt-28 pb-16">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Design System</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            The visual reference for every token and base component this project ships.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section
        id="color"
        title="Color"
        description="OKLCH ramps — espresso (ink/dark surfaces), cream (light surfaces), and the copper brand accent."
      >
        <div className="space-y-6">
          <Swatch name="espresso" ramp={espresso} />
          <Swatch name="cream" ramp={cream} />
          <Swatch name="brand accent" ramp={brandAccent} />
        </div>
      </Section>

      <Section id="typography" title="Typography" description="Fraunces for display, Geist for UI/body.">
        <div className="space-y-4">
          <p className="font-display text-hero leading-(--text-hero--line-height)">Hero</p>
          <p className="font-display text-display leading-(--text-display--line-height)">Display</p>
          <p className="text-3xl font-semibold">Heading / 3xl</p>
          <p className="text-xl font-semibold">Heading / xl</p>
          <p className="text-base">Body — the quick brown fox jumps over the lazy dog.</p>
          <p className="text-muted-foreground text-sm">Small / muted — supporting copy.</p>
        </div>
      </Section>

      <Section id="spacing" title="Spacing" description="Semantic spacing on top of Tailwind's default scale.">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground w-24 font-mono text-xs">section</span>
            <div className="bg-brand-accent-400 h-3" style={{ width: "8rem" }} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground w-24 font-mono text-xs">section-sm</span>
            <div className="bg-brand-accent-400 h-3" style={{ width: "4rem" }} />
          </div>
        </div>
      </Section>

      <Section id="elevation" title="Elevation & Glow" description="Glass shadows and the accent glow used on hover states.">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="bg-card flex h-20 items-center justify-center rounded-lg text-xs shadow-[var(--shadow-glass-sm)]">
            glass sm
          </div>
          <div className="bg-card flex h-20 items-center justify-center rounded-lg text-xs shadow-[var(--shadow-glass-md)]">
            glass md
          </div>
          <div className="bg-card flex h-20 items-center justify-center rounded-lg text-xs shadow-[var(--shadow-glass-lg)]">
            glass lg
          </div>
          <div className="bg-card flex h-20 items-center justify-center rounded-lg text-xs shadow-[var(--shadow-glow-accent)]">
            glow accent
          </div>
        </div>
      </Section>

      <Section id="motion" title="Motion" description="Hover to feel the premium ease curve driving these transitions.">
        <div className="flex gap-6">
          <div className="bg-primary size-16 rounded-lg transition-transform duration-(--duration-base) ease-(--ease-premium) hover:scale-110" />
          <div className="bg-brand-accent-500 size-16 rounded-full transition-transform duration-(--duration-slow) ease-(--ease-premium) hover:translate-y-[-8px]" />
        </div>
      </Section>

      <Section id="glass" title="Glass & Glow surfaces" description="GlassSurface (Navbar base) and GlowCard.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <GlassSurface className="flex h-24 items-center justify-center px-4 text-sm">
            GlassSurface
          </GlassSurface>
          <GlowCard>
            <CardHeader>
              <CardTitle>GlowCard</CardTitle>
              <CardDescription>Hover to see the accent glow.</CardDescription>
            </CardHeader>
          </GlowCard>
        </div>
      </Section>

      <Section id="components" title="Components" description="Every base component in its default state.">
        <div className="space-y-10">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Default</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs">XS</Button>
            <Button size="sm">SM</Button>
            <Button size="default">Default</Button>
            <Button size="lg">LG</Button>
            <Button size="icon" aria-label="Coffee">
              <Coffee className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid max-w-sm gap-3">
            <Input placeholder="Input" />
            <Textarea placeholder="Textarea" />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>Card description text.</CardDescription>
              </CardHeader>
              <CardContent>Card content goes here.</CardContent>
            </Card>
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Avatar>
              <AvatarFallback>CS</AvatarFallback>
            </Avatar>

            <Tooltip>
              <TooltipTrigger render={<Button variant="outline">Hover me</Button>} />
              <TooltipContent>A tooltip, built on Base UI.</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline">
                    Menu <ChevronDown className="size-4" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Bell className="size-4" aria-hidden="true" /> Notifications
                </DropdownMenuItem>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog title</DialogTitle>
                  <DialogDescription>Focus-trapped, Escape-to-close, built on Base UI.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline">Cancel</Button>} />
                  <Button>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger render={<Button variant="outline">Open sheet</Button>} />
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Sheet title</SheetTitle>
                  <SheetDescription>The primitive behind the mobile navigation menu.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Section>
    </div>
  );
}
