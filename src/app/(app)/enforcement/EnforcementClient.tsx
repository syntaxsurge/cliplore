"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { VerifyCard, type VerifyResult } from "./components/VerifyCard";
import { ReportCard } from "./components/ReportCard";
import { ReportsCard } from "./components/ReportsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShieldAlert, Sparkles, Waypoints } from "lucide-react";

export default function EnforcementClient() {
  const { address } = useAccount();
  const [prefill, setPrefill] = useState<VerifyResult | null>(null);
  const [reportsNonce, setReportsNonce] = useState(0);

  const wallet = useMemo(() => address ?? null, [address]);

  useEffect(() => {
    if (!wallet) setPrefill(null);
  }, [wallet]);

  return (
    <TooltipProvider>
      <main
        id="main"
        className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Protection</p>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                Enforcement
              </h1>
              {wallet ? (
                <Badge variant="outline" className="font-mono">
                  {wallet.slice(0, 6)}…{wallet.slice(-4)}
                </Badge>
              ) : null}
            </div>
            <p className="max-w-3xl text-muted-foreground">
              Verify suspected content with SHA-256 + C2PA, pin evidence to IPFS, and raise Story
              disputes with a clear, audit-friendly trail.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/assets">
                <Waypoints className="h-4 w-4" />
                My assets
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/explore">
                <Sparkles className="h-4 w-4" />
                Explore marketplace
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <VerifyCard onResult={setPrefill} />
          </div>
          <div className="lg:col-span-7">
            <ReportCard
              prefill={prefill}
              onSubmitted={() => setReportsNonce((prev) => prev + 1)}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ReportsCard refreshKey={reportsNonce} />
          </div>
          <div className="lg:col-span-4">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">How it works</CardTitle>
                <CardDescription>
                  A lightweight flow designed for quick verification and clean evidence capture.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted/40 text-xs font-medium text-foreground">
                    1
                  </span>
                  <p>
                    <span className="font-medium text-foreground">Verify</span> computes a SHA-256
                    fingerprint (and parses C2PA when supported), then checks for matches against
                    Convex-synced IP assets.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted/40 text-xs font-medium text-foreground">
                    2
                  </span>
                  <p>
                    <span className="font-medium text-foreground">Report</span> pins an evidence
                    bundle to IPFS and raises a dispute via Story’s Dispute Module.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted/40 text-xs font-medium text-foreground">
                    3
                  </span>
                  <p>
                    <span className="font-medium text-foreground">Track</span> your reports and
                    open evidence/transactions for follow-up.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Always confirm you’re reporting the correct target IP and tag. Evidence is
                      immutable once pinned to IPFS.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
