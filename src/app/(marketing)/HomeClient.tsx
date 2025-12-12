"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Blocks,
  Coins,
  Scissors,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURES = [
  {
    title: "Sora‑native generation",
    description:
      "Generate shots from prompts and bring them directly into your timeline.",
    icon: Sparkles,
  },
  {
    title: "On‑chain IP registration",
    description:
      "Register IP Assets on Story Protocol and attach programmable license terms.",
    icon: Blocks,
  },
  {
    title: "Wallet‑first studio",
    description:
      "Connect once with RainbowKit and mint licenses or claim revenue seamlessly.",
    icon: Wallet,
  },
  {
    title: "Fast, in‑browser editing",
    description:
      "Trim, stitch, and preview instantly — no installs, no cloud render queue.",
    icon: Zap,
  },
  {
    title: "Precision trim & stitch",
    description:
      "Cut shots and layer audio/text into timelines with real‑time playback.",
    icon: Scissors,
  },
  {
    title: "Licenses & revenue share",
    description:
      "Mint licenses and track rev shares on‑chain so remixing stays fair.",
    icon: Coins,
  },
] as const;

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
    <div className="space-y-24">
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.22),transparent_65%)]" />
        <div className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.2),transparent_60%)] blur-2xl" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-28">
          <div className="lg:col-span-6 space-y-7">
            <motion.p
              {...fadeUp(0)}
              className="text-sm font-medium text-muted-foreground"
            >
              Sora‑powered, IP‑native video studio
            </motion.p>
            <motion.h1
              {...fadeUp(0.05)}
              className="text-5xl font-semibold tracking-tight text-foreground leading-[1.08] sm:text-6xl"
            >
              Create, edit, and license{" "}
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                video IP
              </span>{" "}
              on‑chain.
            </motion.h1>
            <motion.p
              {...fadeUp(0.1)}
              className="text-lg leading-relaxed text-muted-foreground max-w-xl"
            >
              Generate shots with Sora, assemble timelines in‑browser, then
              register and license the final cut on Story Protocol with built‑in
              revenue sharing.
            </motion.p>

            <motion.div
              {...fadeUp(0.15)}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Button asChild size="lg">
                <Link href="/projects">
                  Start a project
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/explore">Explore IP marketplace</Link>
              </Button>
            </motion.div>

            <motion.div
              {...fadeUp(0.2)}
              className="flex flex-wrap gap-2 text-xs text-muted-foreground"
            >
              <span className="rounded-full border border-border bg-muted px-3 py-1">
                Browser‑first editor
              </span>
              <span className="rounded-full border border-border bg-muted px-3 py-1">
                Story Protocol licenses
              </span>
              <span className="rounded-full border border-border bg-muted px-3 py-1">
                No installs or watermarks
              </span>
            </motion.div>
          </div>

          <motion.div {...fadeUp(0.1)} className="lg:col-span-6">
            <div className="relative w-full overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
              <motion.svg
                viewBox="0 0 720 420"
                className="h-full w-full"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0, ease: EASE_OUT }
                    : { duration: 0.6, ease: EASE_OUT }
                }
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted))" />
                    <stop offset="100%" stopColor="hsl(var(--background))" />
                  </linearGradient>
                  <linearGradient id="clip" x1="0" y1="0" x2="1" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity="0.9"
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity="0.4"
                    />
                  </linearGradient>
                  <radialGradient id="glow" cx="50%" cy="40%" r="60%">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity="0.18"
                    />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>

                <rect width="720" height="420" fill="url(#bg)" />
                <rect width="720" height="420" fill="url(#glow)" />

                <g transform="translate(56 70)">
                  <rect
                    width="608"
                    height="180"
                    rx="18"
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                  />
                  <rect
                    x="22"
                    y="22"
                    width="220"
                    height="136"
                    rx="12"
                    fill="hsl(var(--muted))"
                  />
                  <rect
                    x="262"
                    y="26"
                    width="324"
                    height="18"
                    rx="9"
                    fill="hsl(var(--muted))"
                  />
                  <rect
                    x="262"
                    y="54"
                    width="260"
                    height="12"
                    rx="6"
                    fill="hsl(var(--muted))"
                  />
                  <rect
                    x="262"
                    y="76"
                    width="220"
                    height="12"
                    rx="6"
                    fill="hsl(var(--muted))"
                  />

                  <motion.circle
                    cx="564"
                    cy="46"
                    r="8"
                    fill="hsl(var(--primary))"
                    animate={
                      reduceMotion ? undefined : { opacity: [0.4, 1, 0.4] }
                    }
                    transition={{ duration: 2.2, repeat: Infinity }}
                  />
                  <motion.circle
                    cx="590"
                    cy="46"
                    r="6"
                    fill="hsl(var(--primary))"
                    animate={
                      reduceMotion ? undefined : { opacity: [1, 0.4, 1] }
                    }
                    transition={{ duration: 2.2, repeat: Infinity }}
                  />
                </g>

                <g transform="translate(56 280)">
                  <rect
                    width="608"
                    height="84"
                    rx="18"
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                  />

                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.rect
                      key={i}
                      x={22 + i * 112}
                      y={18 + (i % 2) * 8}
                      width={92}
                      height={48}
                      rx={12}
                      fill="url(#clip)"
                      animate={
                        reduceMotion
                          ? undefined
                          : {
                              y: [
                                18 + (i % 2) * 8,
                                14 + (i % 2) * 8,
                                18 + (i % 2) * 8,
                              ],
                            }
                      }
                      transition={{
                        duration: 2.8 + i * 0.3,
                        repeat: Infinity,
                        ease: EASE_OUT,
                      }}
                    />
                  ))}

                  <motion.rect
                    x="320"
                    y="12"
                    width="3"
                    height="60"
                    rx="1.5"
                    fill="hsl(var(--foreground))"
                    animate={
                      reduceMotion ? undefined : { opacity: [0.3, 1, 0.3] }
                    }
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                </g>
              </motion.svg>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.div {...fadeUp(0)} className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground">
            What Cliplore does
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            A calm, powerful workflow from Sora prompts to licensed Story IP.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} {...fadeUp(index * 0.05)}>
                <Card className="h-full transition-all hover:border-border/80 hover:shadow-md hover:-translate-y-0.5">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.div {...fadeUp(0)} className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground">
            From prompt to licensed IP
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            A simple three‑step flow built for speed and clarity.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "1. Generate",
              body: "Create shots with Sora and bring them into the studio.",
              icon: Sparkles,
            },
            {
              title: "2. Edit",
              body: "Trim, stitch, add audio/text, and preview instantly.",
              icon: Scissors,
            },
            {
              title: "3. License",
              body: "Register your final cut on Story Protocol and mint licenses for remixers.",
              icon: Blocks,
            },
          ].map((step, index) => (
            <motion.div key={step.title} {...fadeUp(index * 0.06)}>
              <Card>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {step.body}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          {...fadeUp(0)}
          className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center space-y-4"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.16),transparent_60%)]" />
          <h3 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Ready to publish your first IP asset?
          </h3>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Start a project, render your timeline, and mint Story licenses
            without leaving the editor.
          </p>
          <div className="flex justify-center">
            <Button asChild size="lg">
              <Link href="/projects">
                Open Projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
