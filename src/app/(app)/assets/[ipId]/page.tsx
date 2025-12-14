"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAccount, useBalance } from "wagmi";
import { formatEther, isAddress, zeroAddress } from "viem";
import { listProjects } from "@/app/store";
import type { ProjectState } from "@/app/types";
import { createConvexIpAsset, fetchConvexIpAssetByIpId } from "@/lib/api/convex";
import { clientEnv } from "@/lib/env/client";
import { getStoryIpaExplorerUrl, getStoryTxExplorerUrl } from "@/lib/story/explorer";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { cn, ipfsUriToGatewayUrl } from "@/lib/utils";
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
import { ArrowLeft, Copy, ExternalLink, Globe, Loader2 } from "lucide-react";

type IpAssetRecord = {
  assetKind: string;
  datasetType: string | null;
  tags: string[];
  mediaMimeType: string | null;
  mediaSizeBytes: number | null;
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

type RoyaltyVaultStatus = "idle" | "loading" | "ready" | "not-deployed" | "error";

function formatUserError(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const candidate =
      typeof (error as any).shortMessage === "string"
        ? String((error as any).shortMessage)
        : typeof (error as any).message === "string"
          ? String((error as any).message)
          : null;

    if (candidate) {
      return candidate.split(" Contract Call:")[0].split(" Docs:")[0];
    }
  }
  return fallback;
}

function formatShortHash(value: string) {
  if (!value) return value;
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function StatusCallout(props: { tone: "success" | "error" | "info"; children: ReactNode }) {
  const { tone, children } = props;
  return (
    <div
      className={cn(
        "max-w-full break-words rounded-md border px-3 py-2 text-sm",
        tone === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          : tone === "error"
            ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200"
            : "border-border/60 bg-muted/30 text-muted-foreground",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

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
          assetKind: "video",
          datasetType: null,
          tags: [],
          mediaMimeType: null,
          mediaSizeBytes: null,
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
  const balanceAddress = address ?? zeroAddress;

  const {
    data: ipBalance,
    isLoading: isIpBalanceLoading,
    refetch: refetchIpBalance,
  } = useBalance({
    address: balanceAddress,
    query: { enabled: Boolean(address) },
  });

  const {
    data: wipBalance,
    isLoading: isWipBalanceLoading,
    refetch: refetchWipBalance,
  } = useBalance({
    address: balanceAddress,
    token: clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`,
    query: { enabled: Boolean(address) },
  });

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
  const [royaltyVaultStatus, setRoyaltyVaultStatus] = useState<RoyaltyVaultStatus>("idle");
  const [royaltyVaultError, setRoyaltyVaultError] = useState<string | null>(null);
  const [vaultRefreshIndex, setVaultRefreshIndex] = useState(0);

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

  const [claimerMode, setClaimerMode] = useState<"wallet" | "ip">("ip");
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
  const [wrapTxHash, setWrapTxHash] = useState<`0x${string}` | null>(null);

  const [unwrapAmount, setUnwrapAmount] = useState("1");
  const [unwrapStatus, setUnwrapStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [unwrapMessage, setUnwrapMessage] = useState<string | null>(null);
  const [unwrapTxHash, setUnwrapTxHash] = useState<`0x${string}` | null>(null);

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
      setLoadError(formatUserError(err, "Failed to load IP asset."));
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
      setRoyaltyVaultStatus("idle");
      setRoyaltyVaultError(null);
      return;
    }

    let cancelled = false;
    setRoyaltyVault(null);
    setRoyaltyVaultStatus("loading");
    setRoyaltyVaultError(null);
    storyClient.royalty
      .getRoyaltyVaultAddress(asset.ipId as `0x${string}`)
      .then((vault) => {
        if (cancelled) return;
        if (vault === zeroAddress) {
          setRoyaltyVault(null);
          setRoyaltyVaultStatus("not-deployed");
          return;
        }
        setRoyaltyVault(vault);
        setRoyaltyVaultStatus("ready");
      })
      .catch((err) => {
        console.error(err);
        if (cancelled) return;
        setRoyaltyVault(null);
        setRoyaltyVaultStatus("error");
        setRoyaltyVaultError(formatUserError(err, "Failed to resolve the IP Royalty Vault."));
      });

    return () => {
      cancelled = true;
    };
  }, [asset?.ipId, storyClient, vaultRefreshIndex]);

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

  const ensureRoyaltiesActive = () => {
    if (royaltyVaultStatus === "loading") {
      throw new Error("Resolving the IP Royalty Vault. Try again in a moment.");
    }
    if (royaltyVaultStatus === "not-deployed") {
      throw new Error(
        "Royalties aren’t active yet. Mint a license or register a derivative to deploy the IP Royalty Vault.",
      );
    }
    if (royaltyVaultStatus === "error") {
      throw new Error(
        royaltyVaultError
          ? `Failed to resolve the IP Royalty Vault: ${royaltyVaultError}`
          : "Failed to resolve the IP Royalty Vault.",
      );
    }
    if (!royaltiesActive) {
      throw new Error("IP Royalty Vault unavailable.");
    }
  };

  const claimerAddress = useMemo(() => {
    if (!asset?.ipId) return null;
    if (claimerMode === "ip") return asset.ipId;
    return address ?? null;
  }, [address, asset?.ipId, claimerMode]);

  const royaltiesActive = royaltyVaultStatus === "ready" && Boolean(royaltyVault);
  const walletReady = Boolean(isConnected && address && storyClient);
  const royaltyVaultDisplay =
    royaltyVaultStatus === "ready" && royaltyVault
      ? royaltyVault
      : royaltyVaultStatus === "loading"
        ? "Resolving…"
        : royaltyVaultStatus === "not-deployed"
          ? "Not active yet"
          : royaltyVaultStatus === "error"
            ? "Failed to resolve"
            : "—";

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
      setSyncMessage(formatUserError(err, "Sync failed."));
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
          toast.error(formatUserError(syncErr, "Marketplace sync failed."));
        }
      }
    } catch (err: any) {
      console.error(err);
      setLicenseStatus("error");
      setLicenseMessage(formatUserError(err, "Failed to attach license terms."));
    }
  };

  const handleTip = async () => {
    setTipStatus("loading");
    setTipMessage(null);
    try {
      ensureWalletReady();
      ensureRoyaltiesActive();
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
      setTipMessage(formatUserError(err, "Tip failed."));
    }
  };

  const handleRefreshClaimable = async () => {
    setClaimableStatus("loading");
    setClaimableMessage(null);
    setClaimMessage(null);
    try {
      ensureWalletReady();
      ensureRoyaltiesActive();
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
      setClaimableMessage(formatUserError(err, "Failed to fetch claimable revenue."));
    }
  };

  const handleClaimAll = async () => {
    setClaimStatus("loading");
    setClaimMessage(null);
    setClaimableMessage(null);
    try {
      ensureWalletReady();
      ensureRoyaltiesActive();
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
      setClaimMessage(formatUserError(err, "Claim failed."));
    }
  };

  const handleFractionalize = async () => {
    setFractionStatus("loading");
    setFractionMessage(null);
    try {
      ensureWalletReady();
      ensureRoyaltiesActive();
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
      setFractionMessage(formatUserError(err, "Transfer failed."));
    }
  };

  const handleWrap = async () => {
    setWrapStatus("loading");
    setWrapMessage(null);
    setWrapTxHash(null);
    try {
      ensureWalletReady();
      const res = await wrapIpToWip({ client: storyClient!, amountIp: wrapAmount });
      setWrapStatus("success");
      setWrapTxHash(res.txHash ?? null);
      setWrapMessage("Wrapped IP → WIP.");
      void refetchIpBalance();
      void refetchWipBalance();
    } catch (err: any) {
      console.error(err);
      setWrapStatus("error");
      setWrapMessage(formatUserError(err, "Wrap failed."));
    }
  };

  const handleUnwrap = async () => {
    setUnwrapStatus("loading");
    setUnwrapMessage(null);
    setUnwrapTxHash(null);
    try {
      ensureWalletReady();
      const res = await unwrapWipToIp({
        client: storyClient!,
        amountWip: unwrapAmount,
      });
      setUnwrapStatus("success");
      setUnwrapTxHash(res.txHash ?? null);
      setUnwrapMessage("Unwrapped WIP → IP.");
      void refetchIpBalance();
      void refetchWipBalance();
    } catch (err: any) {
      console.error(err);
      setUnwrapStatus("error");
      setUnwrapMessage(formatUserError(err, "Unwrap failed."));
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
  const publicPath =
    asset.assetKind === "dataset" ? `/datasets/${asset.ipId}` : `/ip/${asset.ipId}`;
  const publicHref =
    asset.assetKind === "dataset"
      ? `/datasets/${encodeURIComponent(asset.ipId)}`
      : `/ip/${encodeURIComponent(asset.ipId)}`;
  const mediaHref = ipfsUriToGatewayUrl(asset.videoUrl);
  const mediaMimeType =
    asset.mediaMimeType ?? (asset.assetKind === "dataset" ? "" : "video/mp4");

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
	          <Button size="sm" asChild>
	            <Link href={publicHref}>
	              <Globe className="h-4 w-4" />
	              Public page
	            </Link>
	          </Button>
	          <Button size="sm" variant="outline" asChild>
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
              {asset.assetKind === "dataset" ? "`/datasets`" : "`/explore`"} and its public detail page.
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
	              <StatusCallout
	                tone={
	                  syncStatus === "success"
	                    ? "success"
	                    : syncStatus === "error"
	                      ? "error"
	                      : "info"
	                }
	              >
	                {syncMessage}
	              </StatusCallout>
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
              {mediaMimeType.startsWith("video/") ? (
                <video src={mediaHref} controls className="h-full w-full object-contain" />
              ) : mediaMimeType.startsWith("audio/") ? (
                <div className="flex h-full w-full items-center justify-center p-6">
                  <audio src={mediaHref} controls className="w-full" />
                </div>
              ) : mediaMimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaHref} alt={asset.title} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    This file is not previewable in-browser.
                  </p>
                  <Button asChild>
                    <a href={mediaHref} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                  </Button>
                </div>
              )}
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
	                    <Input readOnly value={publicPath} />
	                    <Button
	                      type="button"
	                      size="icon"
	                      variant="outline"
	                      aria-label="Copy public page path"
	                      onClick={() => void handleCopy(publicPath)}
	                    >
	                      <Copy className="h-4 w-4" />
	                    </Button>
	                    <Button asChild type="button" size="icon" variant="outline" aria-label="Open public page">
	                      <Link href={publicHref}>
	                        <Globe className="h-4 w-4" />
	                      </Link>
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
	                    value={royaltyVaultDisplay}
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
	              </div>
	              {licenseMessage ? (
	                <StatusCallout tone={licenseStatus === "success" ? "success" : "error"}>
	                  {licenseMessage}
	                </StatusCallout>
	              ) : null}
	            </CardContent>
	          </Card>

          <Card>
            <CardHeader>
              <CardTitle>License minting</CardTitle>
              <CardDescription>
                The public {asset.assetKind === "dataset" ? "`/datasets/[ipId]`" : "`/ip/[ipId]`"} page
                uses `licenseTermsId` to enable minting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                If you update terms here, the marketplace listing is refreshed so viewers can mint licenses from
                the public page.
              </p>
              <Button asChild variant="secondary">
                <Link href={publicHref}>Open public page</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

	      {tab === "royalties" ? (
	        <div className="grid gap-6 lg:grid-cols-2">
	          <Card className="lg:col-span-2">
	            <CardHeader>
	              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
	                <div className="space-y-1">
	                  <CardTitle>IP Royalty Vault</CardTitle>
	                  <CardDescription>
	                    Onchain vault that receives tips and licensing revenue for this IP.
	                  </CardDescription>
	                </div>
	                <div className="flex flex-wrap items-center gap-2">
	                  {royaltyVaultStatus === "ready" ? (
	                    <Badge variant="success">Active</Badge>
	                  ) : royaltyVaultStatus === "not-deployed" ? (
	                    <Badge variant="warning">Not active</Badge>
	                  ) : royaltyVaultStatus === "loading" ? (
	                    <Badge variant="outline">Resolving…</Badge>
	                  ) : royaltyVaultStatus === "error" ? (
	                    <Badge variant="warning">Resolve failed</Badge>
	                  ) : (
	                    <Badge variant="outline">Unknown</Badge>
	                  )}
	                  <Button
	                    type="button"
	                    size="sm"
	                    variant="outline"
	                    onClick={() => setVaultRefreshIndex((i) => i + 1)}
	                    disabled={royaltyVaultStatus === "loading"}
	                  >
	                    Refresh vault
	                  </Button>
	                </div>
	              </div>
	            </CardHeader>
	            <CardContent className="space-y-4">
	              <div className="flex items-center gap-2">
	                <Input readOnly value={royaltyVaultDisplay} />
	                {royaltiesActive && royaltyVault ? (
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

	              {royaltyVaultStatus === "not-deployed" ? (
	                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground space-y-2">
	                  <p>
	                    Royalties aren’t active yet. Story deploys the IP Royalty Vault after the first license
	                    mint or derivative registration.
	                  </p>
	                  <div className="flex flex-wrap items-center gap-2">
	                    <Button asChild variant="secondary">
	                      <Link href={publicHref}>Open public page</Link>
	                    </Button>
	                    <Button asChild variant="outline">
	                      <a
	                        href="https://docs.story.foundation/developers/typescript-sdk/pay-ipa"
	                        target="_blank"
	                        rel="noreferrer"
	                      >
	                        Story docs
	                      </a>
	                    </Button>
	                  </div>
	                </div>
	              ) : null}

	              {royaltyVaultStatus === "error" && royaltyVaultError ? (
	                <StatusCallout tone="error">{royaltyVaultError}</StatusCallout>
	              ) : null}
	            </CardContent>
	          </Card>

	          <Card>
	            <CardHeader>
	              <CardTitle>Tip this IP</CardTitle>
	              <CardDescription>
	                Send WIP into this IP’s royalty vault. Tips are distributed to Royalty Token holders.
	              </CardDescription>
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
	                <p className="text-xs text-muted-foreground">
	                  Balance:{" "}
	                  {!address
	                    ? "Connect wallet to see balance."
	                    : isWipBalanceLoading
	                      ? "Loading…"
	                      : `${wipBalance?.formatted ?? "0"} WIP`}
	                </p>
	                {!royaltiesActive ? (
	                  <p className="text-sm text-muted-foreground">
	                    Tips are disabled until the IP Royalty Vault is active.
	                  </p>
	                ) : null}
	              </div>
	              <div className="flex flex-wrap items-center gap-2">
	                <Button
	                  onClick={() => void handleTip()}
	                  disabled={tipStatus === "loading" || !walletReady || !royaltiesActive}
	                >
	                  {tipStatus === "loading" ? "Sending…" : "Send tip"}
	                </Button>
	              </div>
	              {tipMessage ? (
	                <StatusCallout tone={tipStatus === "success" ? "success" : "error"}>{tipMessage}</StatusCallout>
	              ) : null}
	            </CardContent>
	          </Card>

	          <Card>
	            <CardHeader>
	              <CardTitle>Claim revenue</CardTitle>
	              <CardDescription>
	                Check claimable WIP and claim it to your wallet. IP account is recommended for creators.
	              </CardDescription>
	            </CardHeader>
	            <CardContent className="space-y-4">
	              <div className="space-y-2">
	                <Label>Claim as</Label>
	                <div
	                  role="tablist"
	                  aria-label="Select claimer mode"
	                  className="inline-flex w-full rounded-md border border-input bg-background p-1"
	                >
	                  <button
	                    type="button"
	                    role="tab"
	                    aria-selected={claimerMode === "ip"}
	                    className={cn(
	                      "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
	                      claimerMode === "ip"
	                        ? "bg-primary text-primary-foreground shadow-sm"
	                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
	                    )}
	                    onClick={() => setClaimerMode("ip")}
	                  >
	                    IP account
	                  </button>
	                  <button
	                    type="button"
	                    role="tab"
	                    aria-selected={claimerMode === "wallet"}
	                    className={cn(
	                      "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
	                      claimerMode === "wallet"
	                        ? "bg-primary text-primary-foreground shadow-sm"
	                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
	                      !address && "pointer-events-none opacity-50",
	                    )}
	                    onClick={() => setClaimerMode("wallet")}
	                    disabled={!address}
	                  >
	                    My wallet
	                  </button>
	                </div>
	                <p className="text-xs text-muted-foreground">
	                  Wallet mode only works if your wallet holds Royalty Tokens for this IP.
	                </p>
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
	                    {!royaltiesActive
	                      ? "Royalties not active"
	                      : claimableWip === null
	                        ? "—"
	                        : `${formatEther(claimableWip)} WIP`}
	                  </span>
	                </p>
	              </div>
	              {!royaltiesActive ? (
	                <p className="text-sm text-muted-foreground">
	                  Claiming is disabled until the IP Royalty Vault is active.
	                </p>
	              ) : null}

	              <div className="flex flex-wrap items-center gap-2">
	                <Button
	                  type="button"
	                  variant="outline"
	                  onClick={() => void handleRefreshClaimable()}
	                  disabled={claimableStatus === "loading" || !walletReady || !royaltiesActive}
	                >
	                  {claimableStatus === "loading" ? "Refreshing…" : "Refresh claimable"}
	                </Button>
	                <Button
	                  type="button"
	                  onClick={() => void handleClaimAll()}
	                  disabled={claimStatus === "loading" || !walletReady || !royaltiesActive}
	                >
	                  {claimStatus === "loading" ? "Claiming…" : "Claim revenue"}
	                </Button>
	              </div>

	              {claimMessage || claimableMessage ? (
	                <StatusCallout
	                  tone={
	                    (claimMessage ? claimStatus : claimableStatus) === "success"
	                      ? "success"
	                      : "error"
	                  }
	                >
	                  {claimMessage ?? claimableMessage}
	                </StatusCallout>
	              ) : null}
	            </CardContent>
	          </Card>

	          <Card className="lg:col-span-2">
	            <CardHeader>
	              <CardTitle>Advanced IPFi</CardTitle>
	              <CardDescription>
	                Transfer Royalty Tokens (ownership) and wrap/unwrap between native IP and WIP.
	              </CardDescription>
	            </CardHeader>
	            <CardContent className="space-y-6">
	              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
	                <p className="font-medium text-foreground">Wallet balances</p>
	                <div className="mt-2 grid gap-1 sm:grid-cols-2">
	                  <p>
	                    IP (native):{" "}
	                    {!address
	                      ? "—"
	                      : isIpBalanceLoading
	                        ? "Loading…"
	                        : `${ipBalance?.formatted ?? "0"} IP`}
	                  </p>
	                  <p>
	                    WIP (ERC-20):{" "}
	                    {!address
	                      ? "—"
	                      : isWipBalanceLoading
	                        ? "Loading…"
	                        : `${wipBalance?.formatted ?? "0"} WIP`}
	                  </p>
	                </div>
	              </div>

	              <details className="rounded-lg border border-border bg-muted/20 p-4">
	                <summary className="cursor-pointer text-sm font-medium text-foreground">
	                  Fractionalize royalties (transfer Royalty Tokens)
	                </summary>
	                <div className="mt-4 space-y-3">
	                  <p className="text-sm text-muted-foreground">
	                    Transfers Royalty Tokens from the IP Account. 100% ownership equals 100,000,000 units.
	                  </p>
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
	                      <Label htmlFor="fractionPercent">Percent (%)</Label>
	                      <div className="relative">
	                        <Input
	                          id="fractionPercent"
	                          inputMode="decimal"
	                          className="pr-10"
	                          value={fractionPercent}
	                          onChange={(e) => setFractionPercent(e.target.value)}
	                        />
	                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
	                          %
	                        </span>
	                      </div>
	                    </div>
	                  </div>
	                  {!royaltiesActive ? (
	                    <p className="text-sm text-muted-foreground">
	                      Royalties must be active (vault deployed) before Royalty Tokens can be transferred.
	                    </p>
	                  ) : null}
	                  <div className="flex flex-wrap items-center gap-2">
	                    <Button
	                      type="button"
	                      onClick={() => void handleFractionalize()}
	                      disabled={fractionStatus === "loading" || !walletReady || !royaltiesActive}
	                    >
	                      {fractionStatus === "loading" ? "Transferring…" : "Transfer"}
	                    </Button>
	                  </div>
	                  {fractionMessage ? (
	                    <StatusCallout tone={fractionStatus === "success" ? "success" : "error"}>
	                      {fractionMessage}
	                    </StatusCallout>
	                  ) : null}
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
	                      <p className="text-xs text-muted-foreground">
	                        Available:{" "}
	                        {!address
	                          ? "—"
	                          : isIpBalanceLoading
	                            ? "Loading…"
	                            : `${ipBalance?.formatted ?? "0"} IP`}
	                      </p>
	                    </div>
	                    <Button
	                      type="button"
	                      onClick={() => void handleWrap()}
	                      disabled={wrapStatus === "loading" || !walletReady}
	                    >
	                      {wrapStatus === "loading" ? "Wrapping…" : "Wrap"}
	                    </Button>
	                    {wrapMessage ? (
	                      <StatusCallout tone={wrapStatus === "success" ? "success" : "error"}>
	                        <div className="space-y-1">
	                          <p>{wrapMessage}</p>
	                          {wrapStatus === "success" && wrapTxHash ? (
	                            <a
	                              className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
	                              href={getStoryTxExplorerUrl({ txHash: wrapTxHash })}
	                              target="_blank"
	                              rel="noreferrer"
	                              title={wrapTxHash}
	                            >
	                              View transaction <span className="font-mono">({formatShortHash(wrapTxHash)})</span>
	                            </a>
	                          ) : null}
	                        </div>
	                      </StatusCallout>
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
	                      <p className="text-xs text-muted-foreground">
	                        Available:{" "}
	                        {!address
	                          ? "—"
	                          : isWipBalanceLoading
	                            ? "Loading…"
	                            : `${wipBalance?.formatted ?? "0"} WIP`}
	                      </p>
	                    </div>
	                    <Button
	                      type="button"
	                      onClick={() => void handleUnwrap()}
	                      disabled={unwrapStatus === "loading" || !walletReady}
	                    >
	                      {unwrapStatus === "loading" ? "Unwrapping…" : "Unwrap"}
	                    </Button>
	                    {unwrapMessage ? (
	                      <StatusCallout tone={unwrapStatus === "success" ? "success" : "error"}>
	                        <div className="space-y-1">
	                          <p>{unwrapMessage}</p>
	                          {unwrapStatus === "success" && unwrapTxHash ? (
	                            <a
	                              className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
	                              href={getStoryTxExplorerUrl({ txHash: unwrapTxHash })}
	                              target="_blank"
	                              rel="noreferrer"
	                              title={unwrapTxHash}
	                            >
	                              View transaction{" "}
	                              <span className="font-mono">({formatShortHash(unwrapTxHash)})</span>
	                            </a>
	                          ) : null}
	                        </div>
	                      </StatusCallout>
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
