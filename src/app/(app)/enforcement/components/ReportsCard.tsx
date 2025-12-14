"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { fetchConvexEnforcementReports } from "@/lib/api/convex";
import { getStoryTxExplorerUrl } from "@/lib/story/explorer";
import { formatShortHash, ipfsUriToGatewayUrl } from "@/lib/utils";
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ExternalLink, RefreshCw } from "lucide-react";

type EnforcementReport = {
  id: string;
  reporterWallet: string;
  targetIpId: string;
  protectedIpId: string | null;
  targetTag: string;
  liveness: number;
  bond: string | null;
  suspectUrl: string | null;
  suspectSha256: string | null;
  suspectFileName: string | null;
  suspectFileType: string | null;
  evidenceCid: string;
  evidenceUri: string;
  disputeId: string | null;
  disputeTxHash: string | null;
  chainId: number | null;
  createdAt: number;
};

function escapeCsvCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  const needsQuotes = /[",\n]/.test(raw);
  const escaped = raw.replaceAll('"', '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function formatCreatedAt(createdAt: number) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportsCard({ refreshKey }: { refreshKey?: number }) {
  const { address } = useAccount();
  const [reports, setReports] = useState<EnforcementReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = useMemo(() => address ?? null, [address]);

  const load = useCallback(async () => {
    if (!wallet) {
      setReports([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { reports } = await fetchConvexEnforcementReports({ wallet });
      setReports(reports as EnforcementReport[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  const exportCsv = useCallback(() => {
    if (!reports.length) return;

    const headers = [
      "createdAt",
      "targetTag",
      "targetIpId",
      "protectedIpId",
      "livenessSeconds",
      "suspectUrl",
      "suspectSha256",
      "evidenceCid",
      "evidenceUri",
      "disputeId",
      "disputeTxHash",
      "chainId",
    ];

    const lines = [
      headers.join(","),
      ...reports.map((r) =>
        [
          new Date(r.createdAt).toISOString(),
          r.targetTag,
          r.targetIpId,
          r.protectedIpId,
          r.liveness,
          r.suspectUrl,
          r.suspectSha256,
          r.evidenceCid,
          r.evidenceUri,
          r.disputeId,
          r.disputeTxHash,
          r.chainId,
        ]
          .map(escapeCsvCell)
          .join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cliplore-enforcement-reports-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [reports]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">My reports</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="tabular-nums">
              {reports.length}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void load()}
              disabled={!wallet || loading}
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportCsv}
              disabled={!reports.length}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Evidence bundles are pinned to IPFS; disputes are submitted on-chain. Export CSV for
          audits or sharing.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!wallet ? (
          <Alert variant="info">
            <AlertTitle>Connect a wallet</AlertTitle>
            <AlertDescription>
              Your enforcement reports are tied to your wallet address.
            </AlertDescription>
          </Alert>
        ) : null}

        {wallet && error ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn’t load reports</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
            <div className="mt-3">
              <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}

        {wallet && loading && !reports.length ? (
          <div className="space-y-2">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : null}

        {wallet && !loading && !error && !reports.length ? (
          <Alert variant="info">
            <AlertTitle>No reports yet</AlertTitle>
            <AlertDescription>
              Run a verification, then pin evidence and raise a dispute to create your first
              report.
            </AlertDescription>
          </Alert>
        ) : null}

        {!!reports.length ? (
          <ul className="space-y-3">
            {reports.map((r) => {
              const evidenceUrl = ipfsUriToGatewayUrl(r.evidenceUri);
              const suspectUrl = r.suspectUrl ? ipfsUriToGatewayUrl(r.suspectUrl) : null;

              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={r.disputeTxHash ? "success" : "outline"}>
                          {r.disputeTxHash ? "Dispute submitted" : "Evidence pinned"}
                        </Badge>
                        <Badge variant="outline">{r.targetTag}</Badge>
                        {r.disputeId ? (
                          <Badge variant="outline">#{r.disputeId}</Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {formatCreatedAt(r.createdAt)} · Liveness{" "}
                        <span className="font-mono tabular-nums">{r.liveness}</span>s
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <a href={evidenceUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Evidence
                        </a>
                      </Button>
                      {r.disputeTxHash ? (
                        <Button asChild size="sm" variant="secondary">
                          <a
                            href={getStoryTxExplorerUrl({ txHash: r.disputeTxHash })}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Tx
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        Target IP
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <code
                          title={r.targetIpId}
                          className="min-w-0 flex-1 break-all rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs"
                        >
                          {r.targetIpId}
                        </code>
                        <CopyIconButton value={r.targetIpId} label="Copy target IP ID" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        Protected IP
                      </div>
                      {r.protectedIpId ? (
                        <div className="flex items-start justify-between gap-2">
                          <code
                            title={r.protectedIpId}
                            className="min-w-0 flex-1 break-all rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs"
                          >
                            {r.protectedIpId}
                          </code>
                          <CopyIconButton
                            value={r.protectedIpId}
                            label="Copy protected IP ID"
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Suspect
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                          <div className="text-xs font-medium text-muted-foreground">
                            URL
                          </div>
                          {suspectUrl ? (
                            <a
                              href={suspectUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block break-all text-xs text-foreground underline-offset-4 hover:underline"
                            >
                              {r.suspectUrl}
                            </a>
                          ) : (
                            <div className="mt-1 text-xs text-muted-foreground">—</div>
                          )}
                        </div>
                        <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                          <div className="text-xs font-medium text-muted-foreground">
                            SHA-256
                          </div>
                          {r.suspectSha256 ? (
                            <div className="mt-1 flex items-start justify-between gap-2">
                              <code
                                title={r.suspectSha256}
                                className="min-w-0 flex-1 break-all font-mono text-xs text-foreground"
                              >
                                {formatShortHash(r.suspectSha256, 10, 8)}
                              </code>
                              <CopyIconButton
                                value={r.suspectSha256}
                                label="Copy suspect SHA-256"
                              />
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-muted-foreground">—</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Evidence CID
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <code
                          title={r.evidenceCid}
                          className="min-w-0 flex-1 break-all rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs"
                        >
                          {r.evidenceCid}
                        </code>
                        <CopyIconButton value={r.evidenceCid} label="Copy evidence CID" />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
