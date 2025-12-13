"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { fetchConvexEnforcementReports } from "@/lib/api/convex";
import { getStoryTxExplorerUrl } from "@/lib/story/explorer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ReportsCard({ refreshKey }: { refreshKey?: number }) {
  const { address } = useAccount();
  const [reports, setReports] = useState<Array<any>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setReports([]);
      setError(null);
      return;
    }

    let mounted = true;
    fetchConvexEnforcementReports({ wallet: address })
      .then(({ reports }) => {
        if (!mounted) return;
        setReports(reports);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
        setReports([]);
      });

    return () => {
      mounted = false;
    };
  }, [address, refreshKey]);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">My reports</CardTitle>
        <p className="text-sm text-muted-foreground">
          Evidence bundles are pinned to IPFS; disputes are submitted on-chain.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            {error}
          </div>
        )}

        {!error && !reports.length && (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            No reports yet.
          </div>
        )}

        {!!reports.length && (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">
                    {r.targetTag} ·{" "}
                    <span className="font-mono text-xs">{r.targetIpId}</span>
                  </div>
                  {r.disputeId && <Badge variant="outline">#{r.disputeId}</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={r.evidenceUri} target="_blank" rel="noreferrer">
                      Evidence
                    </a>
                  </Button>
                  {r.disputeTxHash && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={getStoryTxExplorerUrl({ txHash: r.disputeTxHash })}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Tx
                      </a>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
