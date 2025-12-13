import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEMOS, DEMO_ORDER } from "@/content/demos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Demos | Cliplore",
  description:
    "Watch Cliplore demo cuts and view the exact prompts used for each genre.",
};

const GENRE_ACCENTS: Record<
  (typeof DEMO_ORDER)[number],
  { gradient: string; badge: string }
> = {
  anime: {
    gradient:
      "from-cyan-500/15 via-fuchsia-500/10 to-emerald-500/15 dark:from-cyan-400/15 dark:via-fuchsia-400/10 dark:to-emerald-400/15",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
  },
  horror: {
    gradient:
      "from-red-500/15 via-rose-500/10 to-violet-500/15 dark:from-red-400/15 dark:via-rose-400/10 dark:to-violet-400/15",
    badge: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200",
  },
  fantasy: {
    gradient:
      "from-teal-500/15 via-violet-500/10 to-sky-500/15 dark:from-teal-400/15 dark:via-violet-400/10 dark:to-sky-400/15",
    badge:
      "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-200",
  },
  commercial: {
    gradient:
      "from-slate-500/15 via-cyan-500/10 to-indigo-500/15 dark:from-slate-400/15 dark:via-cyan-400/10 dark:to-indigo-400/15",
    badge:
      "border-slate-500/30 bg-slate-500/10 text-slate-800 dark:text-slate-200",
  },
  brainrot: {
    gradient:
      "from-lime-500/15 via-fuchsia-500/10 to-cyan-500/15 dark:from-lime-400/15 dark:via-fuchsia-400/10 dark:to-cyan-400/15",
    badge: "border-lime-500/30 bg-lime-500/10 text-lime-800 dark:text-lime-200",
  },
};

export default function DemoIndexPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.18),transparent_65%)]" />
        <div className="relative space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Demo hub</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Demos
          </h1>
          <p className="max-w-2xl text-muted-foreground leading-relaxed">
            Each demo includes the final YouTube cut, Story Protocol links, and
            the exact prompts used for both 15-second clips.
          </p>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_ORDER.map((slug) => {
          const demo = DEMOS[slug];
          const accent = GENRE_ACCENTS[slug];

          return (
            <Card
              key={demo.slug}
              className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100",
                  accent.gradient,
                )}
              />
              <CardHeader className="relative space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{demo.label}</CardTitle>
                    <CardDescription className="leading-relaxed">
                      {demo.subtitle}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0", accent.badge)}
                  >
                    30s
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-muted px-3 py-1">
                    2 clips
                  </span>
                  <span className="rounded-full border border-border bg-muted px-3 py-1">
                    YouTube embed
                  </span>
                  <span className="rounded-full border border-border bg-muted px-3 py-1">
                    Prompt copies
                  </span>
                </div>
              </CardHeader>

              <CardContent className="relative flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild className="w-full gap-2">
                    <Link href={`/demo/${demo.slug}`}>
                      Open demo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full gap-2"
                  >
                    <a href={demo.youtubeUrl} target="_blank" rel="noreferrer">
                      YouTube
                      <PlayCircle className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

