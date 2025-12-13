"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { VerifyCard, type VerifyResult } from "./components/VerifyCard";
import { ReportCard } from "./components/ReportCard";
import { ReportsCard } from "./components/ReportsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EnforcementClient() {
  const { address } = useAccount();
  const [prefill, setPrefill] = useState<VerifyResult | null>(null);
  const [reportsNonce, setReportsNonce] = useState(0);

  const wallet = useMemo(() => address ?? null, [address]);

  useEffect(() => {
    if (!wallet) setPrefill(null);
  }, [wallet]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          IP Detection &amp; Enforcement
        </h1>
        <p className="text-sm text-muted-foreground">
          Verify suspected content with SHA-256 + C2PA, pin evidence to IPFS,
          and raise Story disputes.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <VerifyCard onResult={setPrefill} />
        <ReportCard
          prefill={prefill}
          onSubmitted={() => setReportsNonce((prev) => prev + 1)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReportsCard refreshKey={reportsNonce} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What this does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Verify</span>{" "}
              computes a SHA-256 fingerprint and checks it against published IP
              assets synced to Convex.
            </p>
            <p>
              <span className="font-medium text-foreground">C2PA</span>{" "}
              extracts Content Credentials if present (supported formats only).
            </p>
            <p>
              <span className="font-medium text-foreground">Report</span>{" "}
              builds an evidence bundle, pins it to IPFS, then calls{" "}
              <span className="font-mono">client.dispute.raiseDispute</span> on
              Story.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
