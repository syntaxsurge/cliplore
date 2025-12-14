"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { C2paSdk, ManifestStore } from "@contentauth/c2pa-web";
import { fetchConvexIpAssetsBySha256 } from "@/lib/api/convex";
import { sha256HexFromFile } from "@/lib/crypto/sha256";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { formatBytes, ipfsUriToGatewayUrl } from "@/lib/utils";
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, FileSearch, Link as LinkIcon, Loader2 } from "lucide-react";

type VerificationMode = "file" | "url";

type C2paSummary =
  | { status: "idle" }
  | { status: "unsupported"; reason: string }
  | { status: "none" }
  | {
      status: "present";
      activeManifestLabel: string | null;
      issuer: string | null;
      claimGenerator: string | null;
    }
  | { status: "error"; error: string };

export type VerifyResult = {
  sha256: `0x${string}`;
  bytes: number;
  contentType?: string | null;
  url?: string | null;
  matches: Array<any>;
  c2pa: C2paSummary;
};

function summarizeManifestStore(store: ManifestStore): Extract<C2paSummary, { status: "present" }> {
  const activeLabel = store.active_manifest ?? null;
  const activeManifest = activeLabel ? store.manifests[activeLabel] : undefined;
  const issuer =
    activeManifest?.signature_info?.issuer ??
    activeManifest?.signature_info?.common_name ??
    null;
  const claimGenerator = activeManifest?.claim_generator ?? null;

  return {
    status: "present",
    activeManifestLabel: activeLabel,
    issuer,
    claimGenerator,
  };
}

export function VerifyCard({ onResult }: { onResult: (result: VerifyResult | null) => void }) {
  const [mode, setMode] = useState<VerificationMode>("file");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");

  const [sha256, setSha256] = useState<`0x${string}` | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [matches, setMatches] = useState<Array<any>>([]);
  const [c2pa, setC2pa] = useState<C2paSummary>({ status: "idle" });

  const c2paSdkRef = useRef<C2paSdk | null>(null);

  const reset = useCallback(() => {
    setBusy(false);
    setStatus(null);
    setFile(null);
    setUrl("");
    setSha256(null);
    setBytes(null);
    setContentType(null);
    setMatches([]);
    setC2pa({ status: "idle" });
    onResult(null);
  }, [onResult]);

  useEffect(() => {
    return () => {
      c2paSdkRef.current?.dispose();
      c2paSdkRef.current = null;
    };
  }, []);

  const canVerify = useMemo(() => {
    if (busy) return false;
    if (mode === "file") return Boolean(file);
    return url.trim().length > 0;
  }, [busy, file, mode, url]);

  const getC2paSdk = useCallback(async () => {
    if (c2paSdkRef.current) return c2paSdkRef.current;
    const { createC2pa } = await import("@contentauth/c2pa-web/inline");
    const sdk = await createC2pa();
    c2paSdkRef.current = sdk;
    return sdk;
  }, []);

  const runC2paIfPossible = useCallback(
    async (blob: Blob): Promise<C2paSummary> => {
      try {
        const { isSupportedReaderFormat } = await import("@contentauth/c2pa-web");
        if (!isSupportedReaderFormat(blob.type)) {
          const summary: C2paSummary = {
            status: "unsupported",
            reason: `Unsupported format: ${blob.type || "unknown"}`,
          };
          setC2pa(summary);
          return summary;
        }

        const sdk = await getC2paSdk();
        const reader = await sdk.reader.fromBlob(blob.type, blob);
        if (!reader) {
          const summary: C2paSummary = { status: "none" };
          setC2pa(summary);
          return summary;
        }

        try {
          const store = await reader.manifestStore();
          const summary = summarizeManifestStore(store);
          setC2pa(summary);
          return summary;
        } finally {
          await reader.free();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const summary: C2paSummary = { status: "error", error: message };
        setC2pa(summary);
        return summary;
      }
    },
    [getC2paSdk],
  );

  const verify = useCallback(async () => {
    if (!canVerify) return;

    setBusy(true);
    setStatus("Computing SHA-256…");
    setMatches([]);
    setC2pa({ status: "idle" });
    onResult(null);

    try {
      let computedHash: `0x${string}`;
      let computedBytes: number;
      let computedContentType: string | null = null;
      let resolvedUrl: string | null = null;
      let c2paSummary: C2paSummary = { status: "idle" };

      if (mode === "file") {
        const nextFile = file;
        if (!nextFile) return;
        computedHash = await sha256HexFromFile(nextFile);
        computedBytes = nextFile.size;
        computedContentType = nextFile.type || null;
        setStatus("Checking C2PA…");
        c2paSummary = await runC2paIfPossible(nextFile);
      } else {
        const res = await fetch("/api/enforcement/hash-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as {
          url: string;
          sha256: `0x${string}`;
          bytes: number;
          contentType?: string | null;
        };
        computedHash = data.sha256;
        computedBytes = data.bytes;
        computedContentType = data.contentType ?? null;
        resolvedUrl = data.url;
        c2paSummary = {
          status: "unsupported",
          reason: "C2PA is only parsed from uploaded files.",
        };
        setC2pa(c2paSummary);
      }

      setSha256(computedHash);
      setBytes(computedBytes);
      setContentType(computedContentType);
      setStatus("Searching published IP assets…");

      const { matches: found } = await fetchConvexIpAssetsBySha256(computedHash);
      setMatches(found);

      const result: VerifyResult = {
        sha256: computedHash,
        bytes: computedBytes,
        contentType: computedContentType,
        url: resolvedUrl,
        matches: found,
        c2pa: c2paSummary,
      };
      onResult(result);
      setStatus(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }, [canVerify, file, mode, onResult, runC2paIfPossible, url]);

  return (
    <Card className="h-fit">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-4 w-4" />
            Verify
          </CardTitle>
          <Badge variant="outline" className="tabular-nums">
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Compute a content hash (SHA-256) and check for C2PA Content Credentials.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(value) => setMode(value as VerificationMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="file" className="flex-1">
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1">
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4 space-y-2">
            <Label htmlFor="verifyFile">Upload file</Label>
            <Input
              id="verifyFile"
              type="file"
              accept="video/*,image/*,audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Best for C2PA checks. Supported: video, image, audio.
            </p>
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-2">
            <Label htmlFor="verifyUrl">URL</Label>
            <Input
              id="verifyUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://… or ipfs://…"
            />
            <p className="text-xs text-muted-foreground">
              URL hashing runs server-side with SSRF + size limits.
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void verify()} disabled={!canVerify}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Working…
              </>
            ) : (
              "Verify"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={reset} disabled={busy}>
            Clear
          </Button>
        </div>

        {status ? (
          <Alert variant={busy ? "info" : "destructive"}>
            <AlertTitle>{busy ? "Working…" : "Couldn’t verify"}</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{status}</AlertDescription>
          </Alert>
        ) : null}

        {sha256 && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-foreground">Fingerprint</div>
              <div className="flex flex-wrap gap-2">
                {bytes !== null ? (
                  <Badge variant="outline">{formatBytes(bytes)}</Badge>
                ) : null}
                {contentType ? <Badge variant="outline">{contentType}</Badge> : null}
              </div>
            </div>
            <div className="flex items-start justify-between gap-2">
              <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs">
                {sha256}
              </code>
              <CopyIconButton value={sha256} label="Copy SHA-256" />
            </div>
            {mode === "url" && url.trim() ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <LinkIcon className="h-3.5 w-3.5" />
                <span className="break-all">{url.trim()}</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-foreground">C2PA</div>
            <Badge
              variant={
                c2pa.status === "present"
                  ? "success"
                  : c2pa.status === "unsupported" || c2pa.status === "error"
                    ? "warning"
                    : "outline"
              }
            >
              {c2pa.status === "present"
                ? "Present"
                : c2pa.status === "none"
                  ? "None"
                  : c2pa.status === "unsupported"
                    ? "Unsupported"
                    : c2pa.status === "error"
                      ? "Error"
                      : "—"}
            </Badge>
          </div>
          {c2pa.status === "idle" && (
            <div className="text-sm text-muted-foreground">—</div>
          )}
          {c2pa.status === "unsupported" && (
            <div className="text-sm text-muted-foreground">{c2pa.reason}</div>
          )}
          {c2pa.status === "none" && (
            <div className="text-sm text-muted-foreground">
              No Content Credentials detected.
            </div>
          )}
          {c2pa.status === "error" && (
            <div className="text-sm text-muted-foreground">{c2pa.error}</div>
          )}
          {c2pa.status === "present" && (
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Active manifest:</span>{" "}
                <span className="font-mono">
                  {c2pa.activeManifestLabel ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Issuer:</span>{" "}
                {c2pa.issuer ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Claim generator:</span>{" "}
                {c2pa.claimGenerator ?? "—"}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-foreground">Matches</div>
            <Badge variant="outline" className="tabular-nums">
              {matches.length}
            </Badge>
          </div>
          {!matches.length ? (
            <div className="text-sm text-muted-foreground">No match found.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {matches.map((m: any) => (
                <li
                  key={`${m.ipId}-${m.matchOn}`}
                  className="rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{m.title}</div>
                    <Badge variant="outline">{m.matchOn}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs">
                      {m.ipId}
                    </code>
                    <CopyIconButton value={m.ipId} label="Copy IP Asset ID" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/assets/${m.ipId}`}>Open dashboard</a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={
                          (m.assetKind ?? "").toLowerCase() === "dataset"
                            ? `/datasets/${encodeURIComponent(m.ipId)}`
                            : `/ip/${encodeURIComponent(m.ipId)}`
                        }
                      >
                        Public page
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={ipfsUriToGatewayUrl(m.videoUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open file
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={getStoryIpaExplorerUrl({
                          ipId: m.ipId,
                          chainId: typeof m.chainId === "number" ? m.chainId : undefined,
                        })}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Story
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
