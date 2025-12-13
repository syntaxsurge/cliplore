"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { formatEther, isAddress } from "viem";
import { listProjects } from "@/app/store";
import type { ProjectState } from "@/app/types";
import { createConvexIpAsset, fetchConvexIpAssetByIpId } from "@/lib/api/convex";
import { clientEnv } from "@/lib/env/client";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { ipfsUriToGatewayUrl } from "@/lib/utils";
import { claimAllWipRevenue, getClaimableWipRevenue } from "@/features/ipfi/services/claim";
import { setCommercialRemixTerms } from "@/features/ipfi/services/license";
import { tipIpWithWip } from "@/features/ipfi/services/pay";
import { transferRoyaltyPercentToWallet } from "@/features/ipfi/services/fractionalize";
import { unwrapWipToIp, wrapIpToWip } from "@/features/ipfi/services/wip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, ExternalLink, Loader2 } from "lucide-react";

type IpAssetRecord = {
  ipId: string;
  title: string;
  summary: string;
  terms: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  licenseTermsId: string | null;
  txHash: string | null;
  chainId: number | null;
  ipMetadataUri: string | null;
  ipMetadataHash: string | null;
  nftMetadataUri: string | null;
  nftMetadataHash: string | null;
  videoKey: string | null;
  thumbnailKey: string | null;
  licensorWallet: string | null;
  createdAt: number | null;
  updatedAt: number | null;
};

type LocalAssetSource = {
  projectId: string;
  projectTitle: string;
};

type TabKey = "overview" | "licensing" | "royalties" | "files";

function parseTab(value: string | null): TabKey {
  if (value === "licensing" || value === "royalties" || value === "files") return value;
  return "overview";
}

function normalizeIpId(value: string) {
  return value.toLowerCase();
}

async function findLocalAssetByIpId(ipId: string) {
  const projects = (await listProjects()) as ProjectState[];
  const normalized = normalizeIpId(ipId);

  let best: { asset: IpAssetRecord; source: LocalAssetSource } | null = null;

  for (const project of projects ?? []) {
    for (const exp of project.exports ?? []) {
      const publish = exp.publish;
      if (!publish?.ipId) continue;
      if (normalizeIpId(publish.ipId) !== normalized) continue;

      const createdAt = Number.isFinite(Date.parse(publish.createdAt))
        ? new Date(publish.createdAt).getTime()
        : null;

      const candidate = {
        asset: {
          ipId: normalized,
          title: publish.title,
          summary: publish.summary,
          terms: publish.terms,
          videoUrl: publish.videoUrl,
          thumbnailUrl: publish.thumbnailUrl ?? null,
          licenseTermsId: publish.licenseTermsId ?? null,
          txHash: publish.txHash ?? null,
          chainId: clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
          ipMetadataUri: publish.ipMetadataUri ?? null,
          ipMetadataHash: publish.ipMetadataHash ?? null,
          nftMetadataUri: publish.nftMetadataUri ?? null,
          nftMetadataHash: publish.nftMetadataHash ?? null,
          videoKey: publish.videoKey ?? null,
          thumbnailKey: publish.thumbnailKey ?? null,
          licensorWallet: null,
          createdAt,
          updatedAt: createdAt,
        },
        source: {
          projectId: project.id,
          projectTitle: project.projectName,
        },
      } satisfies { asset: IpAssetRecord; source: LocalAssetSource };

      if (!best) {
        best = candidate;
        continue;
      }

      const prevTime = best.asset.updatedAt ?? best.asset.createdAt ?? 0;
      const nextTime = candidate.asset.updatedAt ?? candidate.asset.createdAt ?? 0;
      if (nextTime > prevTime) {
        best = candidate;
      }
    }
  }

  return best;
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams<{ ipId?: string | string[] }>();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const storyClient = useStoryClient();

  const ipIdParam = useMemo(() => {
    const raw = params?.ipId;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
    return "";
  }, [params]);

  const ipId = useMemo(() => normalizeIpId(ipIdParam), [ipIdParam]);
  const tab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);

  const [asset, setAsset] = useState<IpAssetRecord | null>(null);
  const [localSource, setLocalSource] = useState<LocalAssetSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isListedInConvex, setIsListedInConvex] = useState(false);

  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [royaltyVault, setRoyaltyVault] = useState<`0x${string}` | null>(null);
  const [isResolvingVault, setIsResolvingVault] = useState(false);

  const [licenseMintFee, setLicenseMintFee] = useState("1");
  const [licenseRevShare, setLicenseRevShare] = useState(10);
  const [licenseStatus, setLicenseStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [licenseMessage, setLicenseMessage] = useState<string | null>(null);

  const [tipAmount, setTipAmount] = useState("1");
  const [tipStatus, setTipStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [tipMessage, setTipMessage] = useState<string | null>(null);

  const [claimerMode, setClaimerMode] = useState<"wallet" | "ip">("wallet");
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
  const [wrapStatus, setWrapStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [wrapMessage, setWrapMessage] = useState<string | null>(null);

  const [unwrapAmount, setUnwrapAmount] = useState("1");
  const [unwrapStatus, setUnwrapStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [unwrapMessage, setUnwrapMessage] = useState<string | null>(null);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    setSyncStatus("idle");
    setSyncMessage(null);
    setIsListedInConvex(false);

    try {
      const { ipAsset } = await fetchConvexIpAssetByIpId(ipId);
      if (ipAsset) {
        setAsset(ipAsset as IpAssetRecord);
        setLocalSource(null);
        setIsListedInConvex(true);
        return;
      }

      const local = await findLocalAssetByIpId(ipId);
      if (local) {
        setAsset(local.asset);
        setLocalSource(local.source);
        setIsListedInConvex(false);
        return;
      }

      setAsset(null);
      setLocalSource(null);
      setLoadError("IP asset not found.");
    } catch (err: any) {
      setAsset(null);
      setLocalSource(null);
      setLoadError(err?.message ?? "Failed to load IP asset.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ipId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipId]);

  useEffect(() => {
    if (!asset?.ipId || !storyClient) {
      setRoyaltyVault(null);
      return;
    }

    let cancelled = false;
    setIsResolvingVault(true);
    storyClient.royalty
      .getRoyaltyVaultAddress(asset.ipId as `0x${string}`)
      .then((vault) => {
        if (!cancelled) setRoyaltyVault(vault);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setRoyaltyVault(null);
      })
      .finally(() => {
        if (!cancelled) setIsResolvingVault(false);
      });

    return () => {
      cancelled = true;
    };
  }, [asset?.ipId, storyClient]);

  const ensureWalletReady = () => {
    if (!isConnected || !address) {
      throw new Error("Connect a wallet to continue.");
    }
    if (!storyClient) {
      throw new Error("Wallet client not ready yet. Try again in a moment.");
    }
    if (!asset?.ipId) {
      throw new Error("Missing IP ID.");
    }
  };

  const claimerAddress = useMemo(() => {
    if (!asset?.ipId) return null;
    if (claimerMode === "ip") return asset.ipId;
    return address ?? null;
  }, [address, asset?.ipId, claimerMode]);

  const handleSyncToConvex = async () => {
    if (!address) return;
    if (!asset) return;
    if (!localSource) {
      setSyncStatus("error");
      setSyncMessage("No local project source available to sync this asset.");
      return;
    }

    setSyncStatus("syncing");
    setSyncMessage("Syncing asset to Convex…");
    try {
      await createConvexIpAsset({
        wallet: address,
        localProjectId: localSource.projectId,
        projectTitle: localSource.projectTitle,
        ipId: asset.ipId,
        title: asset.title,
        summary: asset.summary,
        terms: asset.terms,
        videoUrl: asset.videoUrl,
        thumbnailUrl: asset.thumbnailUrl ?? undefined,
        licenseTermsId: asset.licenseTermsId ?? undefined,
        txHash: asset.txHash ?? undefined,
        chainId: asset.chainId ?? clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
        ipMetadataUri: asset.ipMetadataUri ?? undefined,
        ipMetadataHash: asset.ipMetadataHash ?? undefined,
        nftMetadataUri: asset.nftMetadataUri ?? undefined,
        nftMetadataHash: asset.nftMetadataHash ?? undefined,
        videoKey: asset.videoKey ?? undefined,
        thumbnailKey: asset.thumbnailKey ?? undefined,
      });

      setSyncStatus("success");
      setSyncMessage("Synced to Convex.");
      await load();
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      setSyncMessage(err?.message ?? "Sync failed.");
    }
  };

  const handleAttachTerms = async () => {
    setLicenseStatus("loading");
    setLicenseMessage(null);
    try {
      ensureWalletReady();
      const res = await setCommercialRemixTerms({
        client: storyClient!,
        ipId: asset!.ipId as `0x${string}`,
        mintingFeeWip: licenseMintFee,
        commercialRevSharePercent: licenseRevShare,
      });

      const nextTerms = `Commercial remix · ${licenseRevShare}% rev share · ${licenseMintFee} WIP fee`;
      const nextLicenseTermsId = res.licenseTermsId.toString();
      const txHash = res.txHash ?? null;

      setAsset((prev) =>
        prev
          ? {
              ...prev,
              terms: nextTerms,
              licenseTermsId: nextLicenseTermsId,
              txHash,
              updatedAt: Date.now(),
            }
          : prev,
      );

      setLicenseStatus("success");
      setLicenseMessage(`License terms attached. Tx: ${txHash ?? "submitted"}`);

      if (address) {
        try {
          await createConvexIpAsset({
            wallet: address,
            localProjectId: localSource?.projectId,
            projectTitle: localSource?.projectTitle,
            ipId: asset!.ipId,
            title: asset!.title,
            summary: asset!.summary,
            terms: nextTerms,
            videoUrl: asset!.videoUrl,
            thumbnailUrl: asset!.thumbnailUrl ?? undefined,
            licenseTermsId: nextLicenseTermsId,
            txHash: txHash ?? undefined,
            chainId: asset!.chainId ?? clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
            ipMetadataUri: asset!.ipMetadataUri ?? undefined,
            ipMetadataHash: asset!.ipMetadataHash ?? undefined,
            nftMetadataUri: asset!.nftMetadataUri ?? undefined,
            nftMetadataHash: asset!.nftMetadataHash ?? undefined,
            videoKey: asset!.videoKey ?? undefined,
            thumbnailKey: asset!.thumbnailKey ?? undefined,
          });
          setIsListedInConvex(true);
        } catch (syncErr: any) {
          console.error(syncErr);
          toast.error(syncErr?.message ?? "Marketplace sync failed.");
        }
      }
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
      ensureWalletReady();
      const res = await tipIpWithWip({
        client: storyClient!,
        receiverIpId: asset!.ipId as `0x${string}`,
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
      ensureWalletReady();
      if (!claimerAddress || !isAddress(claimerAddress)) {
        throw new Error("Valid claimer address required.");
      }
      const amount = await getClaimableWipRevenue({
        client: storyClient!,
        ipId: asset!.ipId as `0x${string}`,
        claimer: claimerAddress as `0x${string}`,
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
      ensureWalletReady();
      if (!claimerAddress || !isAddress(claimerAddress)) {
        throw new Error("Valid claimer address required.");
      }
      const res = await claimAllWipRevenue({
        client: storyClient!,
        ancestorIpId: asset!.ipId as `0x${string}`,
        claimer: claimerAddress as `0x${string}`,
      });
      setClaimStatus("success");
      setClaimMessage(`Claim submitted. Tx: ${res.txHashes?.[0] ?? "submitted"}`);
    } catch (err: any) {
      console.error(err);
      setClaimStatus("error");
      setClaimMessage(err?.message ?? "Claim failed.");
    }
  };

  const handleFractionalize = async () => {
    setFractionStatus("loading");
    setFractionMessage(null);
    try {
      ensureWalletReady();
      if (!isAddress(fractionTarget)) {
        throw new Error("Recipient must be a valid address.");
      }
      const res = await transferRoyaltyPercentToWallet({
        client: storyClient!,
        ipId: asset!.ipId as `0x${string}`,
        target: fractionTarget as `0x${string}`,
        percent: fractionPercent,
      });
      setFractionStatus("success");
      setFractionMessage(`Transfer submitted. Tx: ${res.txHash ?? "submitted"}`);
    } catch (err: any) {
      console.error(err);
      setFractionStatus("error");
      setFractionMessage(err?.message ?? "Transfer failed.");
    }
  };

  const handleWrap = async () => {
    setWrapStatus("loading");
    setWrapMessage(null);
    try {
      ensureWalletReady();
      const res = await wrapIpToWip({ client: storyClient!, amountIp: wrapAmount });
      setWrapStatus("success");
      setWrapMessage(`Wrapped IP→WIP. Tx: ${res.txHash ?? "submitted"}`);
    } catch (err: any) {
      console.error(err);
      setWrapStatus("error");
      setWrapMessage(err?.message ?? "Wrap failed.");
    }
  };

  const handleUnwrap = async () => {
    setUnwrapStatus("loading");
    setUnwrapMessage(null);
    try {
      ensureWalletReady();
      const res = await unwrapWipToIp({
        client: storyClient!,
        amountWip: unwrapAmount,
      });
      setUnwrapStatus("success");
      setUnwrapMessage(`Unwrapped WIP→IP. Tx: ${res.txHash ?? "submitted"}`);
    } catch (err: any) {
      console.error(err);
      setUnwrapStatus("error");
      setUnwrapMessage(err?.message ?? "Unwrap failed.");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading asset…
            </CardTitle>
            <CardDescription>Fetching IP asset details.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!asset || loadError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Asset</CardTitle>
            <CardDescription>{loadError ?? "Not found."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/assets">Back to assets</Link>
            </Button>
            <Button asChild>
              <Link href="/explore">Explore marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabHref = (next: TabKey) =>
    `/assets/${encodeURIComponent(asset.ipId)}?tab=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon">
              <Link href="/assets" aria-label="Back to assets">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">Asset dashboard</p>
          </div>
          <h1 className="text-4xl font-semibold text-foreground">{asset.title}</h1>
          <p className="text-muted-foreground">{asset.summary}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {asset.ipId}
            </Badge>
            <Badge variant={isListedInConvex ? "success" : "warning"}>
              {isListedInConvex ? "Listed" : "Local only"}
            </Badge>
            <Badge variant="outline">{asset.terms}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleCopy(asset.ipId)}
          >
            <Copy className="h-4 w-4" />
            Copy IP ID
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/ip/${encodeURIComponent(asset.ipId)}`}>Public page</Link>
          </Button>
          <Button size="sm" asChild>
            <a
              href={getStoryIpaExplorerUrl({ ipId: asset.ipId })}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Story Explorer
            </a>
          </Button>
        </div>
      </div>

      {!isListedInConvex ? (
        <Card>
          <CardHeader>
            <CardTitle>Marketplace sync</CardTitle>
            <CardDescription>
              This asset is stored locally but isn’t listed in Convex yet. Sync to make it appear on
              `/explore` and `/ip/[ipId]`.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void handleSyncToConvex()}
              disabled={syncStatus === "syncing" || !localSource || !address}
            >
              {syncStatus === "syncing" ? "Syncing…" : "Sync to Convex"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void load()}
              disabled={syncStatus === "syncing"}
            >
              Refresh
            </Button>
            {syncMessage ? (
              <p
                className={`text-sm ${
                  syncStatus === "error"
                    ? "text-destructive"
                    : syncStatus === "success"
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-muted-foreground"
                }`}
              >
                {syncMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "overview" ? "default" : "outline"}
          onClick={() => router.replace(tabHref("overview"))}
        >
          Overview
        </Button>
        <Button
          type="button"
          variant={tab === "licensing" ? "default" : "outline"}
          onClick={() => router.replace(tabHref("licensing"))}
        >
          Licensing
        </Button>
        <Button
          type="button"
          variant={tab === "royalties" ? "default" : "outline"}
          onClick={() => router.replace(tabHref("royalties"))}
        >
          Royalties
        </Button>
        <Button
          type="button"
          variant={tab === "files" ? "default" : "outline"}
          onClick={() => router.replace(tabHref("files"))}
        >
          Files & metadata
        </Button>
      </div>

      {tab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8 overflow-hidden">
            <div className="aspect-video border-b border-border bg-black">
              <video
                src={ipfsUriToGatewayUrl(asset.videoUrl)}
                controls
                className="h-full w-full object-contain"
              />
            </div>
            {asset.thumbnailUrl ? (
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-20 w-36 overflow-hidden rounded-lg border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.thumbnailUrl}
                      alt="Thumbnail"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Thumbnail</p>
                    <p className="text-xs text-muted-foreground">
                      Used for marketplace and Story explorer preview.
                    </p>
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>

          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
                <CardDescription>Share and verify this IP asset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Public page</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={`/ip/${asset.ipId}`} />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Copy public page path"
                      onClick={() => void handleCopy(`/ip/${asset.ipId}`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Story Explorer</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={getStoryIpaExplorerUrl({ ipId: asset.ipId })} />
                    <Button asChild type="button" size="icon" variant="outline" aria-label="Open in explorer">
                      <a
                        href={getStoryIpaExplorerUrl({ ipId: asset.ipId })}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Royalties vault</CardTitle>
                <CardDescription>Royalty Token vault address for this IP.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={
                      royaltyVault
                        ? royaltyVault
                        : isResolvingVault
                          ? "Resolving…"
                          : "Unavailable"
                    }
                  />
                  {royaltyVault ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Copy royalty vault"
                      onClick={() => void handleCopy(royaltyVault)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  100% ownership equals 100,000,000 Royalty Token units.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "licensing" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Attach commercial remix terms</CardTitle>
              <CardDescription>
                Update PIL terms so remixers can mint licenses and share revenue with you.
              </CardDescription>
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

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
                <p>
                  Current terms ID:{" "}
                  <span className="font-mono">{asset.licenseTermsId ?? "—"}</span>
                </p>
                <p>
                  Currency token:{" "}
                  <span className="font-mono">{clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS}</span>
                </p>
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
              <CardTitle>License minting</CardTitle>
              <CardDescription>
                The public `/ip/[ipId]` page uses `licenseTermsId` to enable minting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                If you update terms here, the marketplace listing is refreshed so viewers can mint licenses from
                the public page.
              </p>
              <Button asChild variant="secondary">
                <Link href={`/ip/${encodeURIComponent(asset.ipId)}`}>Open public page</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "royalties" ? (
        <div className="grid gap-6 lg:grid-cols-2">
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
                  Token:{" "}
                  <span className="font-mono">{clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS}</span>
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

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Advanced IPFi</CardTitle>
              <CardDescription>Royalty-token transfers and WIP wrapping utilities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <details className="rounded-lg border border-border bg-muted/20 p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Fractionalize royalties (transfer Royalty Tokens)
                </summary>
                <div className="mt-4 space-y-3">
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
                      {fractionStatus === "loading" ? "Transferring…" : "Transfer"}
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
                </div>
              </details>

              <details className="rounded-lg border border-border bg-muted/20 p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Wrap / unwrap WIP
                </summary>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="wrapAmount">Wrap IP → WIP</Label>
                      <Input
                        id="wrapAmount"
                        inputMode="decimal"
                        value={wrapAmount}
                        onChange={(e) => setWrapAmount(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handleWrap()}
                      disabled={wrapStatus === "loading"}
                    >
                      {wrapStatus === "loading" ? "Wrapping…" : "Wrap"}
                    </Button>
                    {wrapMessage ? (
                      <p
                        className={`text-sm ${
                          wrapStatus === "success"
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-destructive"
                        }`}
                      >
                        {wrapMessage}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="unwrapAmount">Unwrap WIP → IP</Label>
                      <Input
                        id="unwrapAmount"
                        inputMode="decimal"
                        value={unwrapAmount}
                        onChange={(e) => setUnwrapAmount(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handleUnwrap()}
                      disabled={unwrapStatus === "loading"}
                    >
                      {unwrapStatus === "loading" ? "Unwrapping…" : "Unwrap"}
                    </Button>
                    {unwrapMessage ? (
                      <p
                        className={`text-sm ${
                          unwrapStatus === "success"
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-destructive"
                        }`}
                      >
                        {unwrapMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "files" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Storage</CardTitle>
              <CardDescription>Backblaze B2 URLs and keys for this export.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Video URL</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={asset.videoUrl} />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Copy video URL"
                    onClick={() => void handleCopy(asset.videoUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button asChild type="button" size="icon" variant="outline" aria-label="Open video URL">
                    <a href={asset.videoUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                {asset.videoKey ? (
                  <p className="text-xs text-muted-foreground break-all">
                    Key: {asset.videoKey}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={asset.thumbnailUrl ?? "—"} />
                  {asset.thumbnailUrl ? (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Copy thumbnail URL"
                        onClick={() => void handleCopy(asset.thumbnailUrl!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        asChild
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Open thumbnail URL"
                      >
                        <a href={asset.thumbnailUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  ) : null}
                </div>
                {asset.thumbnailKey ? (
                  <p className="text-xs text-muted-foreground break-all">
                    Key: {asset.thumbnailKey}
                  </p>
                ) : null}
              </div>

              {asset.txHash ? (
                <div className="space-y-2">
                  <Label>Register tx hash</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={asset.txHash} />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Copy tx hash"
                      onClick={() => void handleCopy(asset.txHash!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>IPFS metadata</CardTitle>
              <CardDescription>Pinned metadata URIs and SHA-256 hashes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>IP metadata</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={asset.ipMetadataUri ?? "—"} />
                  {asset.ipMetadataUri ? (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Copy IP metadata URI"
                        onClick={() => void handleCopy(asset.ipMetadataUri!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button asChild type="button" size="icon" variant="outline" aria-label="Open IP metadata">
                        <a
                          href={ipfsUriToGatewayUrl(asset.ipMetadataUri)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  ) : null}
                </div>
                {asset.ipMetadataHash ? (
                  <p className="text-xs text-muted-foreground break-all">
                    SHA-256: {asset.ipMetadataHash}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>NFT metadata</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={asset.nftMetadataUri ?? "—"} />
                  {asset.nftMetadataUri ? (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Copy NFT metadata URI"
                        onClick={() => void handleCopy(asset.nftMetadataUri!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        asChild
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Open NFT metadata"
                      >
                        <a
                          href={ipfsUriToGatewayUrl(asset.nftMetadataUri)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  ) : null}
                </div>
                {asset.nftMetadataHash ? (
                  <p className="text-xs text-muted-foreground break-all">
                    SHA-256: {asset.nftMetadataHash}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
