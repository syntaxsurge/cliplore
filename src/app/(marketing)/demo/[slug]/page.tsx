import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Film, ScrollText } from "lucide-react";
import { CopyAllPromptsButton } from "@/components/demo/CopyAllPromptsButton";
import { PromptBlock } from "@/components/demo/PromptBlock";
import { YouTubeEmbed } from "@/components/demo/YouTubeEmbed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEMO_ORDER, getDemo } from "@/content/demos";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return DEMO_ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) return {};

  return {
    title: `${demo.label} Demo | Cliplore`,
    description: `Watch the ${demo.label} demo and view the exact prompts used.`,
  };
}

const GENRE_ACCENTS: Record<
  (typeof DEMO_ORDER)[number],
  { gradient: string; badge: string }
> = {
  anime: {
    gradient:
      "from-cyan-500/18 via-fuchsia-500/12 to-emerald-500/18 dark:from-cyan-400/18 dark:via-fuchsia-400/12 dark:to-emerald-400/18",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
  },
  horror: {
    gradient:
      "from-red-500/18 via-rose-500/12 to-violet-500/18 dark:from-red-400/18 dark:via-rose-400/12 dark:to-violet-400/18",
    badge: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200",
  },
  fantasy: {
    gradient:
      "from-teal-500/18 via-violet-500/12 to-sky-500/18 dark:from-teal-400/18 dark:via-violet-400/12 dark:to-sky-400/18",
    badge:
      "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-200",
  },
  commercial: {
    gradient:
      "from-slate-500/18 via-cyan-500/12 to-indigo-500/18 dark:from-slate-400/18 dark:via-cyan-400/12 dark:to-indigo-400/18",
    badge:
      "border-slate-500/30 bg-slate-500/10 text-slate-800 dark:text-slate-200",
  },
  brainrot: {
    gradient:
      "from-lime-500/18 via-fuchsia-500/12 to-cyan-500/18 dark:from-lime-400/18 dark:via-fuchsia-400/12 dark:to-cyan-400/18",
    badge: "border-lime-500/30 bg-lime-500/10 text-lime-800 dark:text-lime-200",
  },
};

export default async function DemoDetailPage({ params }: Props) {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) notFound();

  const accent = GENRE_ACCENTS[demo.slug];
  const allPrompts = demo.clips.map((clip) => clip.prompt).join("\n\n");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-10">
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-10",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br",
            accent.gradient,
          )}
        />
        <div className="relative space-y-4">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to demos
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {demo.label}
                </h1>
                <Badge
                  variant="outline"
                  className={cn("h-fit", accent.badge)}
                >
                  30s
                </Badge>
              </div>
              <p className="max-w-3xl text-muted-foreground leading-relaxed">
                {demo.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="gap-2">
                <a href="#prompts">
                  <ScrollText className="h-4 w-4" />
                  Prompts
                </a>
              </Button>
              <CopyAllPromptsButton text={allPrompts} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Film className="h-4 w-4 text-muted-foreground" />
              Final cut (YouTube)
            </div>
            <Badge>Embedded</Badge>
          </div>
          <YouTubeEmbed url={demo.youtubeUrl} title={`${demo.label} demo`} />
        </div>

        <Card className="h-fit">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl">Links</CardTitle>
            <CardDescription>
              Story Protocol pages + the hosted video for this demo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Button asChild className="w-full justify-between">
                <a href={demo.youtubeUrl} target="_blank" rel="noreferrer">
                  Open on YouTube
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <a
                href={demo.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-xs text-muted-foreground hover:underline"
              >
                {demo.youtubeUrl}
              </a>
            </div>

            <div className="h-px w-full bg-border" />

            <div className="space-y-2">
              <Button asChild variant="secondary" className="w-full justify-between">
                <a href={demo.storyPortalAssetUrl} target="_blank" rel="noreferrer">
                  Story Portal asset
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <a
                href={demo.storyPortalAssetUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-xs text-muted-foreground hover:underline"
              >
                {demo.storyPortalAssetUrl}
              </a>
            </div>

            <div className="space-y-2">
              <Button asChild variant="secondary" className="w-full justify-between">
                <a href={demo.storyExplorerUrl} target="_blank" rel="noreferrer">
                  Story Explorer (IPA)
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <a
                href={demo.storyExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-xs text-muted-foreground hover:underline"
              >
                {demo.storyExplorerUrl}
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="prompts" className="space-y-6 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Prompts used
            </h2>
            <p className="max-w-3xl text-muted-foreground leading-relaxed">
              These are the exact prompts used for the two 15-second clips that
              make up the 30-second demo.
            </p>
          </div>
          <CopyAllPromptsButton text={allPrompts} />
        </div>

        <div className="grid gap-6">
          {demo.clips.map((clip) => (
            <Card key={clip.title} className="overflow-hidden">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-xl">{clip.title}</CardTitle>
                  <Badge variant="outline">15s</Badge>
                </div>
                <CardDescription>
                  Copy/paste into Sora to reproduce this clip.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PromptBlock text={clip.prompt} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
