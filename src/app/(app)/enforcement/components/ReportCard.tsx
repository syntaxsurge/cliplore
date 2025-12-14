"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { DisputeTargetTag } from "@story-protocol/core-sdk";
import { isAddress } from "viem";
import toast from "react-hot-toast";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { sha256HexFromFile } from "@/lib/crypto/sha256";
import {
  createConvexEnforcementReport,
  fetchConvexIpAssets,
} from "@/lib/api/convex";
import { clientEnv } from "@/lib/env/client";
import { getStoryTxExplorerUrl } from "@/lib/story/explorer";
import { ipfsUriToGatewayUrl } from "@/lib/utils";
import type { EvidenceBundle } from "@/lib/enforcement/evidence";
import { evidenceBundleSchema } from "@/lib/enforcement/evidence";
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Gavel, Loader2 } from "lucide-react";
import type { VerifyResult } from "./VerifyCard";

const DEFAULT_LIVENESS_SECONDS = 60 * 60 * 24 * 30;

export function ReportCard({
  prefill,
  onSubmitted,
}: {
  prefill: VerifyResult | null;
  onSubmitted?: () => void;
}) {
  const client = useStoryClient();
  const { address } = useAccount();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{
    tone: "info" | "success" | "error";
    message: string;
  } | null>(null);
  const [submission, setSubmission] = useState<{
    evidenceUri: string;
    disputeTxHash?: string;
    disputeId?: string;
  } | null>(null);

  const [targetIpId, setTargetIpId] = useState("");
  const [protectedIpId, setProtectedIpId] = useState<string>("");
  const [targetTag, setTargetTag] = useState<DisputeTargetTag>(
    DisputeTargetTag.IMPROPER_USAGE,
  );
  const [livenessSeconds, setLivenessSeconds] = useState(DEFAULT_LIVENESS_SECONDS);

  const [suspectUrl, setSuspectUrl] = useState("");
  const [suspectFile, setSuspectFile] = useState<File | null>(null);
  const [suspectSha256, setSuspectSha256] = useState<`0x${string}` | null>(null);
  const [notes, setNotes] = useState("");

  const [myAssets, setMyAssets] = useState<Array<any>>([]);

  const wallet = useMemo(() => address ?? null, [address]);

  useEffect(() => {
    if (!wallet) {
      setMyAssets([]);
      return;
    }

    let mounted = true;
    fetchConvexIpAssets({ wallet })
      .then(({ ipAssets }) => {
        if (!mounted) return;
        setMyAssets(ipAssets);
      })
      .catch(() => {
        if (!mounted) return;
        setMyAssets([]);
      });

    return () => {
      mounted = false;
    };
  }, [wallet]);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.matches.length === 1) {
      setTargetIpId(prefill.matches[0].ipId);
    }
    setSuspectSha256(prefill.sha256);
    setSubmission(null);
    setStatus(null);
  }, [prefill]);

  const computeSuspectSha = useCallback(async () => {
    if (!suspectFile) {
      setSuspectSha256(null);
      return null;
    }
    const hash = await sha256HexFromFile(suspectFile);
    setSuspectSha256(hash);
    return hash;
  }, [suspectFile]);

  const submit = useCallback(async () => {
    setStatus(null);
    setSubmission(null);
    setBusy(true);

    try {
      if (!wallet) throw new Error("Connect your wallet first.");
      if (!client) throw new Error("Story client not ready yet.");
      if (!targetIpId.trim()) throw new Error("Target IP ID is required.");
      if (!isAddress(targetIpId.trim())) throw new Error("Target IP ID is invalid.");
      if (protectedIpId && !isAddress(protectedIpId)) {
        throw new Error("Protected IP ID is invalid.");
      }
      if (!suspectUrl.trim() && !suspectFile && !suspectSha256) {
        throw new Error("Provide a suspect URL or file.");
      }
      if (!Number.isFinite(livenessSeconds) || livenessSeconds <= 0) {
        throw new Error("Liveness must be a positive number of seconds.");
      }

      setStatus({ tone: "info", message: "Hashing suspect file…" });
      const nextSuspectSha = suspectSha256 ?? (await computeSuspectSha());

      const evidence: EvidenceBundle = {
        schema: "cliplore.enforcement.evidence.v1",
        createdAt: new Date().toISOString(),
        reporterWallet: wallet,
        targetIpId: targetIpId.trim(),
        protectedIpId: protectedIpId || undefined,
        targetTag,
        suspect: {
          url: suspectUrl.trim() || undefined,
          sha256: nextSuspectSha ?? undefined,
          fileName: suspectFile?.name,
          fileType: suspectFile?.type,
          bytes: suspectFile?.size,
        },
        notes: notes.trim() || undefined,
        verification:
          prefill?.c2pa.status === "present"
            ? {
                c2pa: {
                  present: true,
                  activeManifestLabel:
                    prefill.c2pa.activeManifestLabel ?? undefined,
                  issuer: prefill.c2pa.issuer ?? undefined,
                },
              }
            : undefined,
      };

      const validated = evidenceBundleSchema.parse(evidence);

      setStatus({ tone: "info", message: "Pinning evidence to IPFS…" });
      const pinRes = await fetch("/api/enforcement/pin-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!pinRes.ok) throw new Error(await pinRes.text());
      const pinned = (await pinRes.json()) as {
        uri: string;
        cid: string;
        sha256: `0x${string}`;
      };

      setStatus({ tone: "info", message: "Submitting Story dispute…" });
      const disputeRes = await client.dispute.raiseDispute({
        targetIpId: targetIpId.trim() as `0x${string}`,
        cid: pinned.cid,
        targetTag,
        liveness: BigInt(livenessSeconds),
      });

      const disputeId =
        disputeRes.disputeId !== undefined ? disputeRes.disputeId.toString() : undefined;
      const txHash = disputeRes.txHash;

      await createConvexEnforcementReport({
        wallet,
        targetIpId: targetIpId.trim(),
        protectedIpId: protectedIpId || undefined,
        targetTag,
        liveness: livenessSeconds,
        suspectUrl: suspectUrl.trim() || undefined,
        suspectSha256: nextSuspectSha ?? undefined,
        suspectFileName: suspectFile?.name,
        suspectFileType: suspectFile?.type,
        evidenceCid: pinned.cid,
        evidenceUri: pinned.uri,
        disputeId,
        disputeTxHash: txHash,
        chainId: clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
      });
      onSubmitted?.();

      setSubmission({
        evidenceUri: pinned.uri,
        disputeTxHash: txHash,
        disputeId,
      });

      toast.success(txHash ? "Dispute submitted" : "Evidence pinned");
      setStatus({
        tone: "success",
        message: txHash ? "Dispute submitted on Story." : "Evidence pinned to IPFS.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ tone: "error", message });
    } finally {
      setBusy(false);
    }
  }, [
    client,
    computeSuspectSha,
    livenessSeconds,
    notes,
    prefill,
    protectedIpId,
    suspectFile,
    suspectSha256,
    suspectUrl,
    targetIpId,
    targetTag,
    wallet,
    onSubmitted,
  ]);

  return (
    <Card className="h-fit">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gavel className="h-4 w-4" />
          Report
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pin an evidence bundle to IPFS, then open a dispute via the Story
          Dispute Module.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {status ? (
          <Alert
            variant={
              status.tone === "success"
                ? "success"
                : status.tone === "error"
                  ? "destructive"
                  : "info"
            }
          >
            <AlertTitle>
              {status.tone === "success"
                ? "Submitted"
                : status.tone === "error"
                  ? "Couldn’t submit"
                  : "Working…"}
            </AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">
              {status.message}
            </AlertDescription>
            {submission ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="secondary">
                  <a
                    href={ipfsUriToGatewayUrl(submission.evidenceUri)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Evidence
                  </a>
                </Button>
                {submission.disputeTxHash ? (
                  <Button asChild size="sm" variant="secondary">
                    <a
                      href={getStoryTxExplorerUrl({ txHash: submission.disputeTxHash })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Tx
                    </a>
                  </Button>
                ) : null}
                {submission.disputeId ? (
                  <Badge variant="outline">#{submission.disputeId}</Badge>
                ) : null}
              </div>
            ) : null}
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="targetIpId">Target IP ID (dispute target)</Label>
          <Input
            id="targetIpId"
            value={targetIpId}
            onChange={(e) => setTargetIpId(e.target.value)}
            placeholder="0x…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="protectedIpId">Protected IP (optional)</Label>
          <Select
            value={protectedIpId || "__none__"}
            onValueChange={(value) => setProtectedIpId(value === "__none__" ? "" : value)}
          >
            <SelectTrigger id="protectedIpId">
              <SelectValue placeholder="Select an IP Asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {myAssets.map((asset) => (
                <SelectItem key={asset.ipId} value={asset.ipId}>
                  {asset.title} · {asset.ipId.slice(0, 10)}…
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {protectedIpId ? (
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs">
                {protectedIpId}
              </code>
              <CopyIconButton value={protectedIpId} label="Copy protected IP ID" />
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="targetTag">Dispute tag</Label>
            <Select
              value={targetTag}
              onValueChange={(value) => setTargetTag(value as DisputeTargetTag)}
            >
              <SelectTrigger id="targetTag">
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DisputeTargetTag).map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="liveness">Liveness (seconds)</Label>
            <Input
              id="liveness"
              inputMode="numeric"
              value={String(livenessSeconds)}
              onChange={(e) => {
                const next = Number.parseInt(e.target.value, 10);
                setLivenessSeconds(Number.isFinite(next) ? next : DEFAULT_LIVENESS_SECONDS);
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="suspectUrl">Suspect URL (optional)</Label>
          <Input
            id="suspectUrl"
            value={suspectUrl}
            onChange={(e) => setSuspectUrl(e.target.value)}
            placeholder="https://… or ipfs://…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="suspectFile">Or upload suspect file (optional)</Label>
          <Input
            id="suspectFile"
            type="file"
            accept="video/*,image/*,audio/*"
            onChange={(e) => setSuspectFile(e.target.files?.[0] ?? null)}
          />
          {suspectSha256 ? (
            <div className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/20 p-2">
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                {suspectSha256}
              </code>
              <CopyIconButton value={suspectSha256} label="Copy suspect SHA-256" />
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what you found and why it violates the protected IP…"
          />
        </div>

        <Button type="button" onClick={() => void submit()} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Working…
            </>
          ) : (
            <>
              <Gavel className="h-4 w-4" />
              Pin evidence & raise dispute
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
