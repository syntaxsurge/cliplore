"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Blocks,
  BookOpen,
  Check,
  Clapperboard,
  Database,
  FolderPlus,
  Gavel,
  Globe,
  LayoutDashboard,
  PlayCircle,
  Settings,
  Sparkles,
  SquarePen,
  Store,
  Wallet,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type AccessType = "public" | "wallet";

type ProductTone = "violet" | "sky" | "emerald" | "amber" | "rose";

type ProductMapItem = {
  title: string;
  description: string;
  href: string;
  cta: string;
  access: AccessType;
  icon: LucideIcon;
  highlights: readonly string[];
  tone: ProductTone;
};

const PRODUCT_TONE_STYLES = {
  violet: {
    accent: "bg-gradient-to-r from-violet-500/55 via-indigo-500/30 to-transparent",
    glow: "bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10",
    icon: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-200",
  },
  sky: {
    accent: "bg-gradient-to-r from-sky-500/55 via-cyan-500/30 to-transparent",
    glow: "bg-gradient-to-br from-sky-500/10 via-transparent to-cyan-500/10",
    icon: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  },
  emerald: {
    accent: "bg-gradient-to-r from-emerald-500/55 via-teal-500/30 to-transparent",
    glow: "bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10",
    icon: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  },
  amber: {
    accent: "bg-gradient-to-r from-amber-500/55 via-orange-500/30 to-transparent",
    glow: "bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10",
    icon: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  rose: {
    accent: "bg-gradient-to-r from-rose-500/55 via-fuchsia-500/30 to-transparent",
    glow: "bg-gradient-to-br from-rose-500/10 via-transparent to-fuchsia-500/10",
    icon: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-200",
  },
} as const satisfies Record<
  ProductTone,
  { accent: string; glow: string; icon: string }
>;

const PRODUCT_MAP: readonly ProductMapItem[] = [
  {
    title: "Demo hub",
    description:
      "Watch polished demo cuts and copy exact prompts—each demo includes Story links and references.",
    href: "/demo",
    cta: "Open demos",
    access: "public",
    icon: Clapperboard,
    highlights: [
      "Genre cards with demo timelines",
      "YouTube embeds + Story explorer links",
      "Copy-ready prompts for each clip",
    ],
    tone: "amber",
  },
  {
    title: "Demo detail",
    description:
      "Open a single demo page with the final cut, Story links, and the exact prompts used to recreate it.",
    href: "/demo/horror",
    cta: "Open a demo detail",
    access: "public",
    icon: PlayCircle,
    highlights: [
      "YouTube embed + Story links",
      "Copy all prompts in one click",
      "Two clip prompts per demo",
    ],
    tone: "violet",
  },
  {
    title: "Explore marketplace",
    description:
      "Browse Story IP assets, open detail pages (/ip/[ipId]), and mint licenses to remix.",
    href: "/explore",
    cta: "Explore IP",
    access: "public",
    icon: Store,
    highlights: [
      "Marketplace list + filters",
      "License minting from IP detail pages",
      "Jump to remix projects after minting",
    ],
    tone: "sky",
  },
  {
    title: "Dataset marketplace",
    description:
      "Browse datasets and open detail pages (/datasets/[ipId]) with Story + IPFS references.",
    href: "/datasets",
    cta: "Explore datasets",
    access: "public",
    icon: BookOpen,
    highlights: [
      "Marketplace listing for dataset IP assets",
      "License minting and onchain references",
      "Clear metadata + artifact fingerprints",
    ],
    tone: "sky",
  },
  {
    title: "Project library",
    description:
      "Create and manage drafts with search, import/export bundles, and optional metadata sync to Convex.",
    href: "/projects?create=1",
    cta: "Create a project",
    access: "wallet",
    icon: FolderPlus,
    highlights: [
      "Local drafts with import/export bundles",
      "Search + sort by updated/created/name",
      "Quick-start remix projects from licensed IP",
    ],
    tone: "sky",
  },
  {
    title: "Studio",
    description:
      "Generate with Sora and edit timelines in your browser—no installs, no render queue.",
    href: "/projects",
    cta: "Open studio",
    access: "wallet",
    icon: WandSparkles,
    highlights: [
      "Projects list + full-screen editor",
      "AI Studio generation history",
      "Export + publish flow inside the editor",
    ],
    tone: "violet",
  },
  {
    title: "Publish IP",
    description:
      "Turn exports into Story IP Assets with IPFS metadata, fingerprints, and license presets.",
    href: "/projects",
    cta: "Publish from a project",
    access: "wallet",
    icon: Blocks,
    highlights: [
      "Upload exports to Backblaze B2",
      "Pin IPA metadata-standard JSON to IPFS",
      "Register + attach license terms on Story",
    ],
    tone: "emerald",
  },
  {
    title: "Assets",
    description:
      "Manage published IP, files, royalties, and per-asset actions in one creator library.",
    href: "/assets",
    cta: "View assets",
    access: "wallet",
    icon: SquarePen,
    highlights: [
      "Creator asset library with local backfill sync",
      "Asset dashboard (/assets/[ipId]) + IPFi actions",
      "Royalties, licenses, and metadata tabs",
    ],
    tone: "rose",
  },
  {
    title: "Datasets",
    description:
      "Publish dataset samples as Story IP Assets and list them for licensing in the dataset marketplace.",
    href: "/datasets/new",
    cta: "Publish a dataset",
    access: "wallet",
    icon: Database,
    highlights: [
      "Upload sample + cover, pin manifest + metadata",
      "Register dataset IP with versioned dataset payload",
      "Sync marketplace listing to Convex",
    ],
    tone: "amber",
  },
  {
    title: "Enforcement",
    description:
      "Verify suspected content by hashes + C2PA, pin evidence, and raise Story disputes from one workspace.",
    href: "/enforcement",
    cta: "Open enforcement",
    access: "wallet",
    icon: Gavel,
    highlights: [
      "Hash file uploads or remote URLs safely",
      "Pin evidence bundles to IPFS via Pinata",
      "Raise disputes and track reports in Convex",
    ],
    tone: "rose",
  },
  {
    title: "Dashboard",
    description:
      "Your creator cockpit: recent projects, published assets, and Convex sync stats at a glance.",
    href: "/dashboard",
    cta: "Go to dashboard",
    access: "wallet",
    icon: LayoutDashboard,
    highlights: [
      "Project + IP stats",
      "Fast jump into the studio",
      "Recent Story registrations and links",
    ],
    tone: "emerald",
  },
  {
    title: "Settings",
    description:
      "Set creator defaults (license presets + profile) and manage your BYOK key for Sora generation.",
    href: "/settings",
    cta: "Open settings",
    access: "wallet",
    icon: Settings,
    highlights: [
      "Default license preset for new IP assets",
      "Creator display name",
      "OpenAI BYOK key management",
    ],
    tone: "violet",
  },
] as const;

const WORKFLOW: readonly {
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Generate",
    description: "Prompt Sora and keep a clean history tied to your project.",
    icon: Sparkles,
  },
  {
    title: "Edit",
    description: "Assemble clips, text, and audio in a fast in-browser timeline.",
    icon: SquarePen,
  },
  {
    title: "Publish",
    description: "Upload exports, pin metadata to IPFS, and register on Story Protocol.",
    icon: Blocks,
  },
  {
    title: "Monetize",
    description: "Mint licenses for remixers and track royalty flows from asset dashboards.",
    icon: Store,
  },
  {
    title: "Protect",
    description: "Verify hashes + C2PA and raise disputes with evidence bundles when needed.",
    icon: Gavel,
  },
  {
    title: "Scale with data",
    description: "Publish datasets as licensed IP assets and list them in the dataset marketplace.",
    icon: Database,
  },
] as const;

const WORKFLOW_TONES: readonly ProductTone[] = [
  "violet",
  "sky",
  "emerald",
  "rose",
  "amber",
  "sky",
] as const;

function AccessBadge({ access }: { access: AccessType }) {
  if (access === "public") {
    return (
      <Badge variant="outline" className="gap-1.5 whitespace-nowrap">
        <Globe className="h-3.5 w-3.5" />
        Browse
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5 whitespace-nowrap bg-muted/60">
      <Wallet className="h-3.5 w-3.5" />
      Connect wallet
    </Badge>
  );
}

function ProductMapCard({
  card,
  index,
  fadeUp,
}: {
  card: ProductMapItem;
  index: number;
  fadeUp: (delay?: number) => any;
}) {
  const Icon = card.icon;
  const tone = PRODUCT_TONE_STYLES[card.tone];
  return (
    <motion.div {...fadeUp(index * 0.04)} className="h-full">
      <Card className="group relative flex h-full flex-col overflow-hidden rounded-3xl border-border/70 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border hover:shadow-lg">
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-x-0 top-0 h-px", tone.accent)}
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            tone.glow,
          )}
        />

        <CardHeader className="relative space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                  tone.icon,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle className="line-clamp-1 text-base leading-tight tracking-tight">
                  {card.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <AccessBadge access={card.access} />
                </div>
              </div>
            </div>
          </div>

          <CardDescription className="line-clamp-2 text-sm leading-relaxed">
            {card.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative flex-1 space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {card.highlights.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="relative mt-auto pt-0">
          <Button
            asChild
            variant="outline"
            className="group/cta w-full justify-between rounded-xl bg-background/60"
          >
            <Link href={card.href}>
              {card.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default function HomeClient() {
  const reduceMotion = useReducedMotion();
  const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: reduceMotion
      ? { duration: 0, ease: EASE_OUT, delay: 0 }
      : { duration: 0.55, ease: EASE_OUT, delay },
  });

  return (
    <div className="space-y-20 pb-24">
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.22),transparent_65%)]" />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -top-36 right-[-10%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.2),transparent_60%)] blur-2xl"
          animate={reduceMotion ? undefined : { y: [0, 16, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 left-[-10%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_60%)] blur-2xl"
          animate={reduceMotion ? undefined : { y: [0, -14, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:px-8 lg:py-28">
          <div className="lg:col-span-6 space-y-7">
            <motion.div {...fadeUp(0)} className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Sora-assisted studio
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Blocks className="h-3.5 w-3.5" />
                Story Protocol IP
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Gavel className="h-3.5 w-3.5" />
                Enforcement-ready
              </Badge>
            </motion.div>

            <motion.h1
              {...fadeUp(0.05)}
              className="text-5xl font-semibold tracking-tight text-foreground leading-[1.08] sm:text-6xl"
            >
              Build video IP that&apos;s{" "}
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                licensable
              </span>
              , remixable, and enforceable.
            </motion.h1>

            <motion.p
              {...fadeUp(0.1)}
              className="max-w-xl text-lg leading-relaxed text-muted-foreground"
            >
              Generate shots, edit a timeline, publish to Story Protocol, list assets and datasets,
              and protect your work with hashing + evidence-based enforcement.
            </motion.p>

            <motion.div {...fadeUp(0.15)} className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/projects">
                  Open studio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/explore">Explore marketplace</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/demo">See demos</Link>
              </Button>
            </motion.div>

            <motion.div {...fadeUp(0.2)} className="flex flex-wrap gap-2">
              <Badge variant="outline">In-browser editor</Badge>
              <Badge variant="outline">License presets</Badge>
              <Badge variant="outline">Dataset publishing</Badge>
              <Badge variant="outline">C2PA + hashing</Badge>
            </motion.div>
          </div>

          <motion.div {...fadeUp(0.1)} className="lg:col-span-6">
            <Card className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.22),transparent_55%)]" />
              <div className="relative border-b border-border/70 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5" aria-hidden="true">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      Cliplore Studio timeline
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full border border-border bg-muted px-2 py-1">
                      Studio
                    </span>
                    <span className="rounded-full border border-border bg-muted px-2 py-1">
                      Publish
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative p-5 sm:p-7">
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted/10 shadow-sm">
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.25),transparent_55%)]"
                    animate={reduceMotion ? undefined : { opacity: [0.35, 0.55, 0.35] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <Image
                    src="/images/cliplore-timeline.png"
                    alt="Cliplore timeline screenshot"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="relative object-contain p-2"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-muted/10 p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.14),transparent_60%)]" />
          <div className="relative space-y-10">
            <motion.div {...fadeUp(0)} className="space-y-3 text-center">
              <p className="text-sm font-medium text-muted-foreground">Product map</p>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Everything you can do in Cliplore
              </h2>
              <p className="mx-auto max-w-3xl text-muted-foreground">
                Use this as your map: the full Cliplore surface area, organized into one-click entry
                points. Browse the public pages without a wallet, then connect to create, publish,
                and enforce.
              </p>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {PRODUCT_MAP.map((card, index) => (
                <ProductMapCard key={card.title} card={card} index={index} fadeUp={fadeUp} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-muted/10 p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_60%)]" />
          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-start">
            <motion.div {...fadeUp(0)} className="space-y-4 lg:col-span-4">
              <p className="text-sm font-medium text-muted-foreground">Workflow</p>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                A calm, end-to-end workflow
              </h2>
              <p className="text-muted-foreground">
                From first prompt to enforceable rights—without losing context between tools.
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sora generation
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  <Blocks className="h-3.5 w-3.5" />
                  Story registration
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  <Store className="h-3.5 w-3.5" />
                  License minting
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  <Gavel className="h-3.5 w-3.5" />
                  Evidence + disputes
                </Badge>
              </div>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
              {WORKFLOW.map((step, index) => {
                const Icon = step.icon;
                const tone = PRODUCT_TONE_STYLES[WORKFLOW_TONES[index] ?? "violet"];
                const stepNumber = String(index + 1).padStart(2, "0");
                return (
                  <motion.div key={step.title} {...fadeUp(0.05 + index * 0.04)} className="h-full">
                    <Card className="group relative flex h-full flex-col overflow-hidden rounded-3xl border-border/70 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border hover:shadow-lg">
                      <div
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute inset-x-0 top-0 h-px",
                          tone.accent,
                        )}
                      />
                      <div
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                          tone.glow,
                        )}
                      />

                      <CardHeader className="relative space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-2xl border",
                              tone.icon,
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <Badge variant="outline" className="tabular-nums text-[11px]">
                            {stepNumber}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg leading-tight tracking-tight">
                          {step.title}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {step.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-muted/10 p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_60%)]" />
          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-start">
            <motion.div {...fadeUp(0)} className="space-y-4 lg:col-span-5">
              <p className="text-sm font-medium text-muted-foreground">FAQ</p>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Quick answers
              </h2>
              <p className="text-muted-foreground">
                Clear expectations for wallets, publishing, datasets, and enforcement.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline">
                  <Link href="/demo">Open demo hub</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/explore">Explore IP</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div {...fadeUp(0.05)} className="lg:col-span-7">
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/50">
                <div className="border-b border-border/70 px-6 py-5">
                  <p className="text-sm font-medium text-foreground">Common questions</p>
                  <p className="text-sm text-muted-foreground">
                    Short answers with enough detail to keep you moving.
                  </p>
                </div>

                <div className="px-6">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="wallet" className="border-border/70 first:border-t">
                      <AccordionTrigger className="py-5 text-base font-medium hover:no-underline">
                        Do I need a wallet to use Cliplore?
                      </AccordionTrigger>
                      <AccordionContent>
                        Explore and demos are public. Studio pages (projects, dashboard, publishing,
                        enforcement, and settings) are wallet-gated so IP ownership is tied to your
                        account.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="publish" className="border-border/70">
                      <AccordionTrigger className="py-5 text-base font-medium hover:no-underline">
                        What happens when I publish an IP asset?
                      </AccordionTrigger>
                      <AccordionContent>
                        Cliplore uploads your export, pins metadata to IPFS, registers the IP on
                        Story Protocol, and applies license preset terms so remixers can mint
                        licenses.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="datasets" className="border-border/70">
                      <AccordionTrigger className="py-5 text-base font-medium hover:no-underline">
                        What’s different about datasets?
                      </AccordionTrigger>
                      <AccordionContent>
                        Datasets are registered as Story IP Assets with a versioned dataset payload,
                        plus a manifest pointer and hashed artifacts—then listed under the dataset
                        marketplace for licensing.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="enforcement" className="border-border/70">
                      <AccordionTrigger className="py-5 text-base font-medium hover:no-underline">
                        How does enforcement work?
                      </AccordionTrigger>
                      <AccordionContent>
                        You can hash a file upload or a remote URL, verify C2PA credentials when
                        available, pin an evidence bundle to IPFS, and raise Story disputes to track
                        and enforce rights.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          {...fadeUp(0)}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-500/25 via-sky-500/10 to-emerald-500/25 p-px"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.16),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(16,185,129,0.14),transparent_55%)]" />
            <div className="relative mx-auto max-w-2xl space-y-5">
              <p className="text-sm font-medium text-muted-foreground">Get started</p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Start building Story-native video IP
              </h2>
              <p className="text-muted-foreground">
                Open the Studio to create and publish, or explore licensed IP and datasets you can
                remix safely.
              </p>

              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/projects">
                    Open studio
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/explore">Explore IP</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/datasets">Explore datasets</Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">In-browser editor</Badge>
                <Badge variant="outline">IPFS metadata</Badge>
                <Badge variant="outline">License presets</Badge>
                <Badge variant="outline">Evidence bundles</Badge>
              </div>

              <Separator className="my-2" />

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Prefer a guided tour?</span>
                <Button asChild variant="link" className="h-auto p-0 text-xs">
                  <Link href="/demo">Open the demo hub</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
