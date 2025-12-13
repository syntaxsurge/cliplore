"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatEther, isAddress } from "viem";
import toast from "react-hot-toast";
import { getProject, storeProject, useAppDispatch } from "@/app/store";
import { updateProject } from "@/app/store/slices/projectsSlice";
import type { ProjectExport, ProjectPublishRecord, ProjectState } from "@/app/types";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { clientEnv } from "@/lib/env/client";
import { claimAllWipRevenue, getClaimableWipRevenue } from "@/features/ipfi/services/claim";
import { transferRoyaltyPercentToWallet } from "@/features/ipfi/services/fractionalize";
import { setCommercialRemixTerms } from "@/features/ipfi/services/license";
import { tipIpWithWip } from "@/features/ipfi/services/pay";
import { unwrapWipToIp, wrapIpToWip } from "@/features/ipfi/services/wip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, ExternalLink, Loader2 } from "lucide-react";

type PublishedExport = ProjectExport & { publish: ProjectPublishRecord };

function findPublishedExports(project: ProjectState): PublishedExport[] {
  return project.exports
    .filter((exp): exp is PublishedExport => Boolean(exp.publish?.ipId))
    .sort(
      (a, b) =>
        new Date(b.publish.createdAt).getTime() -
        new Date(a.publish.createdAt).getTime(),
    );
}

export default function IpfiClient({
  projectId,
  initialExportId,
}: {
  projectId: string;
  initialExportId?: string;
}) {
  const dispatch = useAppDispatch();
  const { address, isConnected } = useAccount();
  const storyClient = useStoryClient();

  const [project, setProject] = useState<ProjectState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const publishedExports = useMemo(
    () => (project ? findPublishedExports(project) : []),
    [project],
  );

  const [selectedExportId, setSelectedExportId] = useState<string | null>(
    initialExportId ?? null,
  );

  useEffect(() => {
    setSelectedExportId(initialExportId ?? null);
  }, [initialExportId]);

  const selectedPublished = useMemo(() => {
    if (!publishedExports.length) return null;
    if (selectedExportId) {
      const explicit = publishedExports.find((exp) => exp.id === selectedExportId);
      if (explicit) return explicit;
    }
    return publishedExports[0];
  }, [publishedExports, selectedExportId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const loaded = (await getProject(projectId)) as ProjectState | null;
        if (!loaded) {
          setLoadError("Project not found.");
          setProject(null);
          return;
        }
        setProject(loaded);
      } catch (err: any) {
        console.error(err);
        setLoadError(err?.message ?? "Failed to load project.");
        setProject(null);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [projectId]);

  const [royaltyVaultAddress, setRoyaltyVaultAddress] = useState<`0x${string}` | null>(
    null,
  );
  const [isResolvingVault, setIsResolvingVault] = useState(false);

  useEffect(() => {
    const ipId = selectedPublished?.publish.ipId as `0x${string}` | undefined;
    if (!ipId || !storyClient) {
      setRoyaltyVaultAddress(null);
      return;
    }

    let cancelled = false;
    setIsResolvingVault(true);
    storyClient.royalty
      .getRoyaltyVaultAddress(ipId)
      .then((addr) => {
        if (!cancelled) setRoyaltyVaultAddress(addr);
      })
      .catch((err) => {
        console.error("Failed to resolve royalty vault", err);
        if (!cancelled) setRoyaltyVaultAddress(null);
      })
      .finally(() => {
        if (!cancelled) setIsResolvingVault(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPublished?.publish.ipId, storyClient]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const wipAddress = clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`;

  const [licenseMintFee, setLicenseMintFee] = useState("1");
  const [licenseRevShare, setLicenseRevShare] = useState<number>(10);
  const [licenseStatus, setLicenseStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [licenseMessage, setLicenseMessage] = useState<string | null>(null);
  const [latestAttachedTermsId, setLatestAttachedTermsId] = useState<string | null>(
    null,
  );

  const [tipAmount, setTipAmount] = useState("1");
  const [tipStatus, setTipStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [tipMessage, setTipMessage] = useState<string | null>(null);

  const [claimerMode, setClaimerMode] = useState<"ip" | "wallet">("ip");
  const [claimableStatus, setClaimableStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [claimableMessage, setClaimableMessage] = useState<string | null>(null);
  const [claimableWip, setClaimableWip] = useState<bigint | null>(null);
  const [claimStatus, setClaimStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const [fractionTarget, setFractionTarget] = useState("");
  const [fractionPercent, setFractionPercent] = useState("5");
  const [fractionStatus, setFractionStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [fractionMessage, setFractionMessage] = useState<string | null>(null);

  const [wrapAmount, setWrapAmount] = useState("1");
  const [unwrapAmount, setUnwrapAmount] = useState("1");
  const [wipBalance, setWipBalance] = useState<bigint | null>(null);
  const [wipStatus, setWipStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [wipMessage, setWipMessage] = useState<string | null>(null);

  const effectiveIpId = selectedPublished?.publish.ipId as `0x${string}` | undefined;
  const claimerAddress = useMemo(() => {
    if (!effectiveIpId) return null;
    if (claimerMode === "ip") return effectiveIpId;
    return address ?? null;
  }, [address, claimerMode, effectiveIpId]);

  const persistPublishUpdate = async (next: Partial<ProjectPublishRecord>) => {
    if (!project || !selectedPublished) return;

    const nextProject: ProjectState = {
      ...project,
      exports: project.exports.map((exp) =>
        exp.id === selectedPublished.id && exp.publish
          ? { ...exp, publish: { ...exp.publish, ...next } }
          : exp,
      ),
      lastModified: new Date().toISOString(),
    };

    await storeProject(nextProject);
    dispatch(updateProject(nextProject));
    setProject(nextProject);
  };

  const ensureReady = () => {
    if (!isConnected || !address) {
      throw new Error("Connect a wallet to continue.");
    }
    if (!storyClient) {
      throw new Error("Wallet client not ready yet. Try again in a moment.");
    }
    if (!effectiveIpId) {
      throw new Error("This export has no published IP ID.");
    }
  };

  const handleAttachTerms = async () => {
    setLicenseStatus("loading");
    setLicenseMessage(null);
    try {
      ensureReady();
      const res = await setCommercialRemixTerms({
        client: storyClient!,
        ipId: effectiveIpId!,
        mintingFeeWip: licenseMintFee,
        commercialRevSharePercent: licenseRevShare,
      });
      setLatestAttachedTermsId(res.licenseTermsId.toString());
      setLicenseStatus("success");
      setLicenseMessage(`License attached. Tx: ${res.txHash ?? "submitted"}`);
      await persistPublishUpdate({
        licenseTermsId: res.licenseTermsId.toString(),
        terms: `Commercial remix · ${licenseRevShare}% rev share · ${licenseMintFee} WIP fee`,
      });
    } catch (err: any) {
      console.error(err);
      setLicenseStatus("error");
      setLicenseMessage(err?.message ?? "Failed to attach license terms.");
    }
  };

  const handleTip = async () => {
    setTipStatus("loading");
    setTipMessage(null);
    try {
      ensureReady();
      const res = await tipIpWithWip({
        client: storyClient!,
        receiverIpId: effectiveIpId!,
        amountWip: tipAmount,
      });
      setTipStatus("success");
      setTipMessage(`Tip sent. Tx: ${res.txHash ?? "submitted"}`);
    } catch (err: any) {
      console.error(err);
      setTipStatus("error");
      setTipMessage(err?.message ?? "Tip failed.");
    }
  };

  const handleRefreshClaimable = async () => {
    setClaimableStatus("loading");
    setClaimableMessage(null);
    try {
      ensureReady();
      if (!claimerAddress) throw new Error("Claimer address is required.");

      const amount = await getClaimableWipRevenue({
        client: storyClient!,
        ipId: effectiveIpId!,
        claimer: claimerAddress,
      });
      setClaimableWip(amount);
      setClaimableStatus("success");
      setClaimableMessage("Claimable revenue updated.");
    } catch (err: any) {
      console.error(err);
      setClaimableStatus("error");
      setClaimableMessage(err?.message ?? "Failed to fetch claimable revenue.");
    }
  };

  const handleClaimAll = async () => {
    setClaimStatus("loading");
    setClaimMessage(null);
    try {
      ensureReady();
      if (!claimerAddress) throw new Error("Claimer address is required.");

      const res = await claimAllWipRevenue({
        client: storyClient!,
        ancestorIpId: effectiveIpId!,
        claimer: claimerAddress,
      });
      setClaimStatus("success");
      setClaimMessage(`Claim submitted. Tx: ${res.txHashes?.[0] ?? "submitted"}`);
      void handleRefreshClaimable();
    } catch (err: any) {
      console.error(err);
      setClaimStatus("error");
      setClaimMessage(err?.message ?? "Failed to claim revenue.");
    }
  };

  const handleFractionalize = async () => {
    setFractionStatus("loading");
    setFractionMessage(null);
    try {
      ensureReady();
      if (!isAddress(fractionTarget)) throw new Error("Recipient must be a valid address.");

      const res = await transferRoyaltyPercentToWallet({
        client: storyClient!,
        ipId: effectiveIpId!,
        target: fractionTarget as `0x${string}`,
        percent: fractionPercent,
      });
      setFractionStatus("success");
      setFractionMessage(`Transferred. Tx: ${res.txHash ?? "submitted"}`);
    } catch (err: any) {
      console.error(err);
      setFractionStatus("error");
      setFractionMessage(err?.message ?? "Transfer failed.");
    }
  };

  const refreshWipBalance = useCallback(async () => {
    if (!storyClient || !address) return;
    try {
      const bal = await storyClient.wipClient.balanceOf(address as `0x${string}`);
      setWipBalance(bal);
    } catch (err) {
      console.error("Failed to fetch WIP balance", err);
      setWipBalance(null);
    }
  }, [address, storyClient]);

  useEffect(() => {
    void refreshWipBalance();
  }, [refreshWipBalance]);

  const handleWrap = async () => {
    setWipStatus("loading");
    setWipMessage(null);
    try {
      if (!isConnected || !address) throw new Error("Connect a wallet to continue.");
      if (!storyClient) throw new Error("Wallet client not ready yet. Try again in a moment.");
      const res = await wrapIpToWip({ client: storyClient, amountIp: wrapAmount });
      setWipStatus("success");
      setWipMessage(`Wrapped IP → WIP. Tx: ${res.txHash ?? "submitted"}`);
      void refreshWipBalance();
    } catch (err: any) {
      console.error(err);
      setWipStatus("error");
      setWipMessage(err?.message ?? "Wrap failed.");
    }
  };

  const handleUnwrap = async () => {
    setWipStatus("loading");
    setWipMessage(null);
    try {
      if (!isConnected || !address) throw new Error("Connect a wallet to continue.");
      if (!storyClient) throw new Error("Wallet client not ready yet. Try again in a moment.");
      const res = await unwrapWipToIp({
        client: storyClient,
        amountWip: unwrapAmount,
      });
      setWipStatus("success");
      setWipMessage(`Unwrapped WIP → IP. Tx: ${res.txHash ?? "submitted"}`);
      void refreshWipBalance();
    } catch (err: any) {
      console.error(err);
      setWipStatus("error");
      setWipMessage(err?.message ?? "Unwrap failed.");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Loading IPFi…</CardTitle>
            <CardDescription>Fetching your project and published exports.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>IPFi</CardTitle>
            <CardDescription>{loadError ?? "Project unavailable."}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/projects">Back to projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedPublished) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link href={`/projects/${projectId}/publish`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">IPFi</h1>
            <p className="text-sm text-muted-foreground">{project.projectName}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No published exports</CardTitle>
            <CardDescription>
              Publish an export to Story Protocol to unlock IPFi actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/projects/${projectId}/publish`}>Go to publish</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/projects/${projectId}`}>Back to editor</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const publish = selectedPublished.publish;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link href={`/projects/${projectId}/publish`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold">IPFi</h1>
              <Badge variant="outline">Story Aeneid</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{project.projectName}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={`/projects/${projectId}`}>Back to editor</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Published clip</CardTitle>
          <CardDescription>Choose which published export to manage with IPFi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="publishedExport">Published export</Label>
              <select
                id="publishedExport"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedPublished.id}
                onChange={(e) => setSelectedExportId(e.target.value)}
              >
                {publishedExports.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.name} · {new Date(exp.publish.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Current license</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{publish.terms}</Badge>
                {publish.licenseTermsId ? (
                  <Badge variant="outline">Terms #{publish.licenseTermsId}</Badge>
                ) : null}
              </div>
            </div>
          </div>

          {publish.videoUrl ? (
            <video
              src={publish.videoUrl}
              controls
              className="w-full rounded-lg border border-border bg-black"
            />
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>IP ID</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={publish.ipId} />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Copy IP ID"
                  onClick={() => void handleCopy(publish.ipId)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button asChild type="button" size="icon" variant="outline" aria-label="Open in explorer">
                  <a
                    href={`https://explorer.story.foundation/ip-assets/${publish.ipId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Royalty Vault (Royalty Token)</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={
                    royaltyVaultAddress
                      ? royaltyVaultAddress
                      : isResolvingVault
                        ? "Resolving…"
                        : "Unavailable"
                  }
                />
                {royaltyVaultAddress ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Copy royalty vault address"
                    onClick={() => void handleCopy(royaltyVaultAddress)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Royalty Tokens are ERC-20 shares at the vault address (100% = 100,000,000 units).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>License & monetization</CardTitle>
            <CardDescription>Attach commercial remix terms (mint fee + revenue share).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mintFee">Minting fee (WIP)</Label>
                <Input
                  id="mintFee"
                  inputMode="decimal"
                  value={licenseMintFee}
                  onChange={(e) => setLicenseMintFee(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revShare">Commercial revenue share (%)</Label>
                <Input
                  id="revShare"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={licenseRevShare}
                  onChange={(e) => setLicenseRevShare(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
              <p>Currency token: {wipAddress}</p>
              {latestAttachedTermsId ? <p>Last attached terms: {latestAttachedTermsId}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => void handleAttachTerms()}
                disabled={licenseStatus === "loading"}
              >
                {licenseStatus === "loading" ? "Attaching…" : "Attach terms"}
              </Button>
              {licenseMessage ? (
                <p
                  className={`text-sm ${
                    licenseStatus === "success"
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-destructive"
                  }`}
                >
                  {licenseMessage}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tip this IP</CardTitle>
            <CardDescription>Send WIP tips/payments into the IP Royalty Vault.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipAmount">Amount (WIP)</Label>
              <Input
                id="tipAmount"
                inputMode="decimal"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void handleTip()} disabled={tipStatus === "loading"}>
                {tipStatus === "loading" ? "Sending…" : "Send tip"}
              </Button>
              {tipMessage ? (
                <p
                  className={`text-sm ${
                    tipStatus === "success"
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-destructive"
                  }`}
                >
                  {tipMessage}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Royalties dashboard</CardTitle>
            <CardDescription>Check claimable revenue and claim WIP to your wallet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={claimerMode === "ip" ? "default" : "outline"}
                onClick={() => setClaimerMode("ip")}
              >
                Claim as IP Account
              </Button>
              <Button
                type="button"
                variant={claimerMode === "wallet" ? "default" : "outline"}
                onClick={() => setClaimerMode("wallet")}
                disabled={!address}
              >
                Claim as my wallet
              </Button>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
              <p>
                Claimer: <span className="font-mono">{claimerAddress ?? "—"}</span>
              </p>
              <p>
                Token: <span className="font-mono">{wipAddress}</span>
              </p>
              <p>
                Claimable:{" "}
                <span className="font-mono">
                  {claimableWip === null ? "—" : `${formatEther(claimableWip)} WIP`}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleRefreshClaimable()}
                disabled={claimableStatus === "loading"}
              >
                {claimableStatus === "loading" ? "Refreshing…" : "Refresh claimable"}
              </Button>
              <Button
                type="button"
                onClick={() => void handleClaimAll()}
                disabled={claimStatus === "loading"}
              >
                {claimStatus === "loading" ? "Claiming…" : "Claim revenue"}
              </Button>
            </div>

            {claimableMessage ? (
              <p
                className={`text-sm ${
                  claimableStatus === "success"
                    ? "text-emerald-600 dark:text-emerald-300"
                    : "text-destructive"
                }`}
              >
                {claimableMessage}
              </p>
            ) : null}
            {claimMessage ? (
              <p
                className={`text-sm ${
                  claimStatus === "success"
                    ? "text-emerald-600 dark:text-emerald-300"
                    : "text-destructive"
                }`}
              >
                {claimMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fractionalize royalties</CardTitle>
            <CardDescription>
              Transfer a percentage of Royalty Tokens to another wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fractionTarget">Recipient</Label>
                <Input
                  id="fractionTarget"
                  placeholder="0x…"
                  value={fractionTarget}
                  onChange={(e) => setFractionTarget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fractionPercent">Percent</Label>
                <Input
                  id="fractionPercent"
                  inputMode="decimal"
                  placeholder="5"
                  value={fractionPercent}
                  onChange={(e) => setFractionPercent(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void handleFractionalize()}
                disabled={fractionStatus === "loading"}
              >
                {fractionStatus === "loading" ? "Transferring…" : "Transfer share"}
              </Button>
              {fractionMessage ? (
                <p
                  className={`text-sm ${
                    fractionStatus === "success"
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-destructive"
                  }`}
                >
                  {fractionMessage}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WIP (wrap / unwrap)</CardTitle>
          <CardDescription>
            Wrap native IP → WIP for royalty flows and DeFi primitives.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
            <p>
              Wallet: <span className="font-mono">{address ?? "—"}</span>
            </p>
            <p>
              WIP balance:{" "}
              <span className="font-mono">
                {wipBalance === null ? "—" : `${formatEther(wipBalance)} WIP`}
              </span>
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="wrapAmount">Wrap amount (IP)</Label>
                <Input
                  id="wrapAmount"
                  inputMode="decimal"
                  value={wrapAmount}
                  onChange={(e) => setWrapAmount(e.target.value)}
                />
              </div>
              <Button onClick={() => void handleWrap()} disabled={wipStatus === "loading"}>
                Wrap IP → WIP
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="unwrapAmount">Unwrap amount (WIP)</Label>
                <Input
                  id="unwrapAmount"
                  inputMode="decimal"
                  value={unwrapAmount}
                  onChange={(e) => setUnwrapAmount(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => void handleUnwrap()}
                disabled={wipStatus === "loading"}
              >
                Unwrap WIP → IP
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshWipBalance()}
            >
              Refresh balance
            </Button>
            {wipMessage ? (
              <p
                className={`text-sm ${
                  wipStatus === "success"
                    ? "text-emerald-600 dark:text-emerald-300"
                    : "text-destructive"
                }`}
              >
                {wipMessage}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
