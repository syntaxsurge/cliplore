"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { HeroStudio } from "./HeroStudio";
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
            <HeroStudio />
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
