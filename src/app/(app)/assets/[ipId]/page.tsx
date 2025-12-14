"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAccount, useBalance } from "wagmi";
import { formatEther, isAddress, zeroAddress } from "viem";
import { listProjects } from "@/app/store";
import type { ProjectState } from "@/app/types";
import {
  fetchConvexIpAssetByIpId,
  upsertConvexIpAsset,
} from "@/lib/api/convex";
import { clientEnv } from "@/lib/env/client";
import {
  getStoryIpaExplorerUrl,
  getStoryTxExplorerUrl,
} from "@/lib/story/explorer";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { formatShortHash, ipfsUriToGatewayUrl } from "@/lib/utils";
import {
  claimAllWipRevenue,
  getClaimableWipRevenue,
} from "@/features/ipfi/services/claim";
import { transferRoyaltyPercentToWallet } from "@/features/ipfi/services/fractionalize";
import { setCommercialRemixTerms } from "@/features/ipfi/services/license";
import { tipIpWithWip } from "@/features/ipfi/services/pay";
import { unwrapWipToIp, wrapIpToWip } from "@/features/ipfi/services/wip";
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import { ExternalLinkIconButton } from "@/components/data-display/ExternalLinkIconButton";
import { TruncatedCode } from "@/components/data-display/TruncatedCode";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Fingerprint,
  Globe,
  Hash,
  Loader2,
  Wallet,
} from "lucide-react";

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

type RoyaltyVaultStatus =
  | "idle"
  | "loading"
  | "ready"
  | "not-deployed"
  | "error";

function StoryTxReceipt(props: { txHash: string | null; chainId?: number | null }) {
  const { txHash, chainId } = props;

  if (!txHash) {
    return (
      <p className="text-xs text-muted-foreground">
        Tx: <span className="font-mono">submitted</span>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Transaction hash</p>
      <code className="block break-all rounded-md bg-background/60 px-2 py-1 font-mono text-[11px] text-foreground">
        {txHash}
      </code>
      <a
        className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
        href={getStoryTxExplorerUrl({
          txHash,
          chainId: chainId ?? undefined,
        })}
        target="_blank"
        rel="noreferrer noopener"
      >
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
        View on Story Explorer
      </a>
    </div>
  );
}

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

function parseTab(value: string | null): TabKey {
  if (value === "licensing" || value === "royalties" || value === "files")
    return value;
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
      const nextTime =
        candidate.asset.updatedAt ?? candidate.asset.createdAt ?? 0;
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
  const [royaltyVaultStatus, setRoyaltyVaultStatus] =
    useState<RoyaltyVaultStatus>("idle");
  const [royaltyVaultError, setRoyaltyVaultError] = useState<string | null>(
    null,
  );
  const [vaultRefreshIndex, setVaultRefreshIndex] = useState(0);

  const [licenseMintFee, setLicenseMintFee] = useState("1");
  const [licenseRevShare, setLicenseRevShare] = useState(10);
  const [licenseStatus, setLicenseStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [licenseMessage, setLicenseMessage] = useState<string | null>(null);
  const [licenseTxHash, setLicenseTxHash] = useState<string | null>(null);

  const [tipAmount, setTipAmount] = useState("1");
  const [tipStatus, setTipStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [tipMessage, setTipMessage] = useState<string | null>(null);
  const [tipTxHash, setTipTxHash] = useState<string | null>(null);

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
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);

  const [fractionTarget, setFractionTarget] = useState("");
  const [fractionPercent, setFractionPercent] = useState("5");
  const [fractionStatus, setFractionStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [fractionMessage, setFractionMessage] = useState<string | null>(null);
  const [fractionTxHash, setFractionTxHash] = useState<string | null>(null);

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
        setRoyaltyVaultError(
          formatUserError(err, "Failed to resolve the IP Royalty Vault."),
        );
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

  const royaltiesActive =
    royaltyVaultStatus === "ready" && Boolean(royaltyVault);
  const walletReady = Boolean(isConnected && address && storyClient);

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
      throw new Error("Failed to resolve the IP Royalty Vault.");
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
      await upsertConvexIpAsset({
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
    setLicenseTxHash(null);
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
      setLicenseMessage("License terms attached.");
      setLicenseTxHash(txHash);

      if (address) {
        try {
          await upsertConvexIpAsset({
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
      setLicenseMessage(formatUserError(err, "Failed to attach terms."));
    }
  };

  const handleTip = async () => {
    setTipStatus("loading");
    setTipMessage(null);
    setTipTxHash(null);
    try {
      ensureWalletReady();
      ensureRoyaltiesActive();
      const res = await tipIpWithWip({
        client: storyClient!,
        receiverIpId: asset!.ipId as `0x${string}`,
        amountWip: tipAmount,
      });
      setTipStatus("success");
      setTipMessage("Tip sent.");
      setTipTxHash(res.txHash ?? null);
      void refetchWipBalance();
    } catch (err: any) {
      console.error(err);
      setTipStatus("error");
      setTipMessage(formatUserError(err, "Tip failed."));
    }
  };

  const handleRefreshClaimable = async () => {
    setClaimableStatus("loading");
    setClaimableMessage(null);
    setClaimableWip(null);
    try {
      ensureWalletReady();
      ensureRoyaltiesActive();
      if (!claimerAddress) throw new Error("Missing claimer address.");
      const claimable = await getClaimableWipRevenue({
        client: storyClient!,
        ipId: asset!.ipId as `0x${string}`,
        claimer: claimerAddress as `0x${string}`,
      });
      setClaimableStatus("success");
      setClaimableWip(claimable);
      setClaimableMessage("Claimable refreshed.");
    } catch (err: any) {
      console.error(err);
      setClaimableStatus("error");
      setClaimableMessage(formatUserError(err, "Failed to refresh claimable."));
    }
  };

  const handleClaimAll = async () => {
    setClaimStatus("loading");
    setClaimMessage(null);
    setClaimTxHash(null);
    try {
      ensureWalletReady();
      ensureRoyaltiesActive();
      if (!claimerAddress) throw new Error("Missing claimer address.");
      const res = await claimAllWipRevenue({
        client: storyClient!,
        ancestorIpId: asset!.ipId as `0x${string}`,
        claimer: claimerAddress as `0x${string}`,
      });
      setClaimStatus("success");
      setClaimMessage("Claim submitted.");
      setClaimTxHash(res.txHashes?.[0] ?? null);
      void refetchWipBalance();
    } catch (err: any) {
      console.error(err);
      setClaimStatus("error");
      setClaimMessage(formatUserError(err, "Claim failed."));
    }
  };

  const handleFractionalize = async () => {
    setFractionStatus("loading");
    setFractionMessage(null);
    setFractionTxHash(null);
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
      setFractionMessage("Transfer submitted.");
      setFractionTxHash(res.txHash ?? null);
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
      const res = await wrapIpToWip({
        client: storyClient!,
        amountIp: wrapAmount,
      });
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
    asset.assetKind === "dataset"
      ? `/datasets/${asset.ipId}`
      : `/ip/${asset.ipId}`;
  const publicHref =
    asset.assetKind === "dataset"
      ? `/datasets/${encodeURIComponent(asset.ipId)}`
      : `/ip/${encodeURIComponent(asset.ipId)}`;
  const mediaHref = ipfsUriToGatewayUrl(asset.videoUrl);
  const mediaMimeType =
    asset.mediaMimeType ?? (asset.assetKind === "dataset" ? "" : "video/mp4");
  const storyIpaUrl = getStoryIpaExplorerUrl({
    ipId: asset.ipId,
    chainId: asset.chainId ?? undefined,
  });
  const storyTxUrl = asset.txHash
    ? getStoryTxExplorerUrl({
        txHash: asset.txHash,
        chainId: asset.chainId ?? undefined,
      })
    : null;

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
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
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              {asset.title}
            </h1>
            <p className="text-muted-foreground">{asset.summary}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                IP: {formatShortHash(asset.ipId)}
              </Badge>
              <Badge variant={asset.licenseTermsId ? "success" : "warning"}>
                {asset.licenseTermsId ? "Mintable" : "Terms missing"}
              </Badge>
              <Badge variant={isListedInConvex ? "success" : "warning"}>
                {isListedInConvex ? "Listed" : "Local only"}
              </Badge>
              <Badge variant="outline">
                {asset.assetKind === "dataset" ? "Dataset" : "Video"}
              </Badge>
              {asset.assetKind === "dataset" && asset.datasetType ? (
                <Badge variant="outline">{asset.datasetType}</Badge>
              ) : null}
            </div>
          </div>

	          <div className="flex flex-wrap items-center gap-2">
	            <Button size="sm" variant="secondary" asChild>
	              <Link href={publicHref}>
	                <Globe className="h-4 w-4" />
	                Public page
	              </Link>
	            </Button>
	          </div>
	        </div>

        {!isListedInConvex ? (
          <Card>
            <CardHeader>
              <CardTitle>Marketplace sync</CardTitle>
              <CardDescription>
                This asset is stored locally but isn’t listed in Convex yet.
                Sync to make it appear on{" "}
                {asset.assetKind === "dataset" ? "`/datasets`" : "`/explore`"}{" "}
                and its public detail page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => void handleSyncToConvex()}
                  disabled={
                    syncStatus === "syncing" || !localSource || !address
                  }
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
              </div>

              {syncMessage ? (
                <Alert
                  variant={
                    syncStatus === "success"
                      ? "success"
                      : syncStatus === "error"
                        ? "destructive"
                        : "info"
                  }
                  role={syncStatus === "error" ? "alert" : "status"}
                >
                  <AlertDescription>{syncMessage}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

	        <Tabs
	          value={tab}
	          onValueChange={(next) =>
	            router.replace(tabHref(parseTab(next)), { scroll: false })
	          }
	        >
	          <TabsList className="h-12 w-full justify-start bg-muted/60 p-1.5 text-foreground/80 shadow-sm sm:w-fit">
	            <TabsTrigger
	              value="overview"
	              className="px-4 py-2 text-sm sm:text-base"
	            >
	              Overview
	            </TabsTrigger>
	            <TabsTrigger
	              value="licensing"
	              className="px-4 py-2 text-sm sm:text-base"
	            >
	              Licensing
	            </TabsTrigger>
	            <TabsTrigger
	              value="royalties"
	              className="px-4 py-2 text-sm sm:text-base"
	            >
	              Royalties
	            </TabsTrigger>
	            <TabsTrigger value="files" className="px-4 py-2 text-sm sm:text-base">
	              Files & metadata
	            </TabsTrigger>
	          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-8 overflow-hidden">
                <div className="aspect-video border-b border-border bg-black">
                  {mediaMimeType.startsWith("video/") ? (
                    <video
                      src={mediaHref}
                      controls
                      className="h-full w-full object-contain"
                    />
                  ) : mediaMimeType.startsWith("audio/") ? (
                    <div className="flex h-full w-full items-center justify-center p-6">
                      <audio src={mediaHref} controls className="w-full" />
                    </div>
                  ) : mediaMimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaHref}
                      alt={asset.title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        This file is not previewable in-browser.
                      </p>
                      <Button asChild>
                        <a
                          href={mediaHref}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
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
                          src={ipfsUriToGatewayUrl(asset.thumbnailUrl)}
                          alt="Thumbnail"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          Thumbnail
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Used for marketplace and explorer previews.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                ) : null}
              </Card>

              <div className="space-y-6 lg:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Identifiers</CardTitle>
                    <CardDescription>
                      Copy IDs and open them in the explorer.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 text-sm">
                      <div className="grid gap-1">
                        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Fingerprint className="size-3.5" />
                          IP Asset ID
                        </p>
                        <div className="flex min-w-0 items-center gap-2">
                          <TruncatedCode value={asset.ipId} />
                          <CopyIconButton
                            value={asset.ipId}
                            label="Copy IP Asset ID"
                          />
                          <ExternalLinkIconButton
                            href={storyIpaUrl}
                            label="Open in Story Explorer"
                          />
                        </div>
                      </div>

                      {asset.licensorWallet ? (
                        <div className="grid gap-1">
                          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Wallet className="size-3.5" />
                            Creator wallet
                          </p>
                          <div className="flex min-w-0 items-center gap-2">
                            <TruncatedCode value={asset.licensorWallet} />
                            <CopyIconButton
                              value={asset.licensorWallet}
                              label="Copy creator wallet"
                            />
                          </div>
                        </div>
                      ) : null}

                      {asset.txHash && storyTxUrl ? (
                        <div className="grid gap-1">
                          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Hash className="size-3.5" />
                            Registration tx
                          </p>
                          <div className="flex min-w-0 items-center gap-2">
                            <TruncatedCode value={asset.txHash} />
                            <ExternalLinkIconButton
                              href={storyTxUrl}
                              label="Open tx in Story Explorer"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Links</CardTitle>
                    <CardDescription>
                      Share and verify this IP asset.
                    </CardDescription>
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
                        <Button
                          asChild
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label="Open public page"
                        >
                          <Link href={publicHref}>
                            <Globe className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Story Explorer</Label>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={storyIpaUrl} />
                        <Button
                          asChild
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label="Open in explorer"
                        >
                          <a
                            href={storyIpaUrl}
                            target="_blank"
                            rel="noreferrer noopener"
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
                    <CardDescription>
                      Royalty Token vault address for this IP.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input readOnly value={royaltyVaultDisplay} />
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
          </TabsContent>

          <TabsContent value="licensing">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Attach commercial remix terms</CardTitle>
                  <CardDescription>
                    Update PIL terms so remixers can mint licenses and share
                    revenue with you.
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
                      <Label htmlFor="revShare">
                        Commercial revenue share (%)
                      </Label>
                      <Input
                        id="revShare"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={licenseRevShare}
                        onChange={(e) =>
                          setLicenseRevShare(Number(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
                    <p>
                      Current terms ID:{" "}
                      <span className="font-mono">
                        {asset.licenseTermsId ?? "—"}
                      </span>
                    </p>
                    <p>
                      Currency token:{" "}
                      <span className="font-mono">
                        {clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => void handleAttachTerms()}
                      disabled={licenseStatus === "loading"}
                    >
                      {licenseStatus === "loading"
                        ? "Attaching…"
                        : "Attach terms"}
                    </Button>
                  </div>

                  {licenseMessage ? (
                    <Alert
                      variant={
                        licenseStatus === "success" ? "success" : "destructive"
                      }
                      role={licenseStatus === "error" ? "alert" : "status"}
                    >
                      <AlertDescription className="space-y-2">
                        <p>{licenseMessage}</p>
                        {licenseStatus === "success" ? (
                          <StoryTxReceipt
                            txHash={licenseTxHash}
                            chainId={asset.chainId}
                          />
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>License minting</CardTitle>
                  <CardDescription>
                    The public{" "}
                    {asset.assetKind === "dataset"
                      ? "`/datasets/[ipId]`"
                      : "`/ip/[ipId]`"}{" "}
                    page uses `licenseTermsId` to enable minting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    If you update terms here, the marketplace listing is
                    refreshed so viewers can mint licenses from the public page.
                  </p>
                  <Button asChild variant="secondary">
                    <Link href={publicHref}>Open public page</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="royalties">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <CardTitle>IP Royalty Vault</CardTitle>
                      <CardDescription>
                        Onchain vault that receives tips and licensing revenue
                        for this IP.
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
                        Royalties aren’t active yet. Story deploys the IP
                        Royalty Vault after the first license mint or derivative
                        registration.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="secondary">
                          <Link href={publicHref}>Open public page</Link>
                        </Button>
                        <Button asChild variant="outline">
                          <a
                            href="https://docs.story.foundation/developers/typescript-sdk/pay-ipa"
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Story docs
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {royaltyVaultStatus === "error" && royaltyVaultError ? (
                    <Alert variant="destructive" role="alert">
                      <AlertDescription>{royaltyVaultError}</AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tip this IP</CardTitle>
                  <CardDescription>
                    Send WIP into this IP’s royalty vault. Tips are distributed
                    to Royalty Token holders.
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
                      disabled={
                        tipStatus === "loading" ||
                        !walletReady ||
                        !royaltiesActive
                      }
                    >
                      {tipStatus === "loading" ? "Sending…" : "Send tip"}
                    </Button>
                  </div>
                  {tipMessage ? (
                    <Alert
                      variant={
                        tipStatus === "success" ? "success" : "destructive"
                      }
                      role={tipStatus === "error" ? "alert" : "status"}
                    >
                      <AlertDescription className="space-y-2">
                        <p>{tipMessage}</p>
                        {tipStatus === "success" ? (
                          <StoryTxReceipt
                            txHash={tipTxHash}
                            chainId={asset.chainId}
                          />
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Claim revenue</CardTitle>
                  <CardDescription>
                    Check claimable WIP and claim it to your wallet. IP account
                    is recommended for creators.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="claimerMode">Claim as</Label>
                    <Select
                      value={claimerMode}
                      onValueChange={(value) =>
                        setClaimerMode(value as "ip" | "wallet")
                      }
                    >
                      <SelectTrigger
                        id="claimerMode"
                        aria-label="Select claimer mode"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ip">IP account</SelectItem>
                        <SelectItem value="wallet" disabled={!address}>
                          My wallet
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Wallet mode only works if your wallet holds Royalty Tokens
                      for this IP.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
                    <p>
                      Claimer:{" "}
                      <span className="font-mono">{claimerAddress ?? "—"}</span>
                    </p>
                    <p>
                      Token:{" "}
                      <span className="font-mono">
                        {clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS}
                      </span>
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
                      disabled={
                        claimableStatus === "loading" ||
                        !walletReady ||
                        !royaltiesActive
                      }
                    >
                      {claimableStatus === "loading"
                        ? "Refreshing…"
                        : "Refresh claimable"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleClaimAll()}
                      disabled={
                        claimStatus === "loading" ||
                        !walletReady ||
                        !royaltiesActive
                      }
                    >
                      {claimStatus === "loading"
                        ? "Claiming…"
                        : "Claim revenue"}
                    </Button>
                  </div>

                  {claimMessage || claimableMessage ? (
                    <Alert
                      variant={
                        (claimMessage ? claimStatus : claimableStatus) ===
                        "success"
                          ? "success"
                          : "destructive"
                      }
                      role={
                        (claimMessage ? claimStatus : claimableStatus) ===
                        "error"
                          ? "alert"
                          : "status"
                      }
                    >
                      <AlertDescription className="space-y-2">
                        <p>{claimMessage ?? claimableMessage}</p>
                        {claimMessage && claimStatus === "success" ? (
                          <StoryTxReceipt
                            txHash={claimTxHash}
                            chainId={asset.chainId}
                          />
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Advanced IPFi</CardTitle>
                  <CardDescription>
                    Transfer Royalty Tokens (ownership) and wrap/unwrap between
                    native IP and WIP.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      Wallet balances
                    </p>
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

                  <Accordion
                    type="multiple"
                    className="rounded-lg border border-border bg-muted/20 px-4"
                  >
                    <AccordionItem value="fractionalize">
                      <AccordionTrigger>
                        Fractionalize royalties
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Transfers Royalty Tokens from the IP Account. 100%
                            ownership equals 100,000,000 units.
                          </p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="fractionTarget">Recipient</Label>
                              <Input
                                id="fractionTarget"
                                placeholder="0x…"
                                value={fractionTarget}
                                onChange={(e) =>
                                  setFractionTarget(e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="fractionPercent">
                                Percent (%)
                              </Label>
                              <div className="relative">
                                <Input
                                  id="fractionPercent"
                                  inputMode="decimal"
                                  className="pr-10"
                                  value={fractionPercent}
                                  onChange={(e) =>
                                    setFractionPercent(e.target.value)
                                  }
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                          {!royaltiesActive ? (
                            <p className="text-sm text-muted-foreground">
                              Royalties must be active (vault deployed) before
                              Royalty Tokens can be transferred.
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              onClick={() => void handleFractionalize()}
                              disabled={
                                fractionStatus === "loading" ||
                                !walletReady ||
                                !royaltiesActive
                              }
                            >
                              {fractionStatus === "loading"
                                ? "Transferring…"
                                : "Transfer"}
                            </Button>
                          </div>
                          {fractionMessage ? (
                            <Alert
                              variant={
                                fractionStatus === "success"
                                  ? "success"
                                  : "destructive"
                              }
                              role={
                                fractionStatus === "error" ? "alert" : "status"
                              }
                            >
                              <AlertDescription className="space-y-2">
                                <p>{fractionMessage}</p>
                                {fractionStatus === "success" ? (
                                  <StoryTxReceipt
                                    txHash={fractionTxHash}
                                    chainId={asset.chainId}
                                  />
                                ) : null}
                              </AlertDescription>
                            </Alert>
                          ) : null}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="wrap">
                      <AccordionTrigger>Wrap / unwrap WIP</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-6 md:grid-cols-2">
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
                              disabled={
                                wrapStatus === "loading" || !walletReady
                              }
                            >
                              {wrapStatus === "loading" ? "Wrapping…" : "Wrap"}
                            </Button>
                            {wrapMessage ? (
                              <Alert
                                variant={
                                  wrapStatus === "success"
                                    ? "success"
                                    : "destructive"
                                }
                                role={
                                  wrapStatus === "error" ? "alert" : "status"
                                }
                              >
                                <AlertDescription className="space-y-2">
                                  <p>{wrapMessage}</p>
                                  {wrapStatus === "success" ? (
                                    <StoryTxReceipt
                                      txHash={wrapTxHash}
                                      chainId={asset.chainId}
                                    />
                                  ) : null}
                                </AlertDescription>
                              </Alert>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="unwrapAmount">
                                Unwrap WIP → IP
                              </Label>
                              <Input
                                id="unwrapAmount"
                                inputMode="decimal"
                                value={unwrapAmount}
                                onChange={(e) =>
                                  setUnwrapAmount(e.target.value)
                                }
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
                              disabled={
                                unwrapStatus === "loading" || !walletReady
                              }
                            >
                              {unwrapStatus === "loading"
                                ? "Unwrapping…"
                                : "Unwrap"}
                            </Button>
                            {unwrapMessage ? (
                              <Alert
                                variant={
                                  unwrapStatus === "success"
                                    ? "success"
                                    : "destructive"
                                }
                                role={
                                  unwrapStatus === "error" ? "alert" : "status"
                                }
                              >
                                <AlertDescription className="space-y-2">
                                  <p>{unwrapMessage}</p>
                                  {unwrapStatus === "success" ? (
                                    <StoryTxReceipt
                                      txHash={unwrapTxHash}
                                      chainId={asset.chainId}
                                    />
                                  ) : null}
                                </AlertDescription>
                              </Alert>
                            ) : null}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="files">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Storage</CardTitle>
                  <CardDescription>
                    Backblaze B2 URLs and keys for this export.
                  </CardDescription>
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
                      <Button
                        asChild
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Open video URL"
                      >
                        <a
                          href={ipfsUriToGatewayUrl(asset.videoUrl)}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    {asset.videoKey ? (
                      <p className="break-all text-xs text-muted-foreground">
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
                            <a
                              href={ipfsUriToGatewayUrl(asset.thumbnailUrl)}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      ) : null}
                    </div>
                    {asset.thumbnailKey ? (
                      <p className="break-all text-xs text-muted-foreground">
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
                        {storyTxUrl ? (
                          <Button
                            asChild
                            type="button"
                            size="icon"
                            variant="outline"
                            aria-label="Open tx in Story Explorer"
                          >
                            <a
                              href={storyTxUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>IPFS metadata</CardTitle>
                  <CardDescription>
                    Pinned metadata URIs and SHA-256 hashes.
                  </CardDescription>
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
                            onClick={() =>
                              void handleCopy(asset.ipMetadataUri!)
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            asChild
                            type="button"
                            size="icon"
                            variant="outline"
                            aria-label="Open IP metadata"
                          >
                            <a
                              href={ipfsUriToGatewayUrl(asset.ipMetadataUri)}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      ) : null}
                    </div>
                    {asset.ipMetadataHash ? (
                      <p className="break-all text-xs text-muted-foreground">
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
                            onClick={() =>
                              void handleCopy(asset.nftMetadataUri!)
                            }
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
                              rel="noreferrer noopener"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      ) : null}
                    </div>
                    {asset.nftMetadataHash ? (
                      <p className="break-all text-xs text-muted-foreground">
                        SHA-256: {asset.nftMetadataHash}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
