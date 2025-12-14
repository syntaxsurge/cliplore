"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { listProjects } from "@/app/store";
import type { ProjectPublishRecord, ProjectState } from "@/app/types";
import { createConvexIpAsset, fetchConvexIpAssets } from "@/lib/api/convex";
import { clientEnv } from "@/lib/env/client";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, RefreshCw, UploadCloud } from "lucide-react";

type LocalPublishedAsset = {
  ipId: string;
  projectId: string;
  projectName: string;
  exportId: string;
  exportName: string;
  publish: ProjectPublishRecord;
};

type MarketplaceAsset = {
  assetKind?: string;
  datasetType?: string | null;
  tags?: string[] | null;
  mediaMimeType?: string | null;
  mediaSizeBytes?: number | null;
  ipId: string;
  title: string;
  summary: string;
  terms: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  licenseTermsId: string | null;
  txHash: string | null;
  chainId: number | null;
  licensorWallet: string;
  createdAt: number;
  updatedAt: number;
};

function collectLocalPublishedAssets(projects: ProjectState[]) {
  const assets: LocalPublishedAsset[] = [];
  for (const project of projects) {
    for (const exp of project.exports) {
      if (!exp.publish?.ipId) continue;
      assets.push({
        ipId: exp.publish.ipId,
        projectId: project.id,
        projectName: project.projectName,
        exportId: exp.id,
        exportName: exp.name,
        publish: exp.publish,
      });
    }
  }

  return assets.sort(
    (a, b) =>
      new Date(b.publish.createdAt).getTime() -
      new Date(a.publish.createdAt).getTime(),
  );
}

function toMarketplaceAssetFromLocal(
  local: LocalPublishedAsset,
  wallet: string,
): MarketplaceAsset {
  return {
    ipId: local.publish.ipId.toLowerCase(),
    title: local.publish.title,
    summary: local.publish.summary,
    terms: local.publish.terms,
    videoUrl: local.publish.videoUrl,
    thumbnailUrl: local.publish.thumbnailUrl ?? null,
    licenseTermsId: local.publish.licenseTermsId ?? null,
    txHash: local.publish.txHash ?? null,
    chainId: clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
    licensorWallet: wallet,
    createdAt: new Date(local.publish.createdAt).getTime(),
    updatedAt: new Date(local.publish.createdAt).getTime(),
  };
}

export default function AssetsPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [localProjects, setLocalProjects] = useState<ProjectState[]>([]);
  const [remoteAssets, setRemoteAssets] = useState<MarketplaceAsset[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);
  const [isLoadingRemote, setIsLoadingRemote] = useState(true);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const localPublished = useMemo(
    () => collectLocalPublishedAssets(localProjects),
    [localProjects],
  );

  const mergedAssets = useMemo(() => {
    const byIpId = new Map<string, MarketplaceAsset>();
    for (const asset of remoteAssets) {
      byIpId.set(asset.ipId.toLowerCase(), asset);
    }
    for (const local of localPublished) {
      const key = local.publish.ipId.toLowerCase();
      if (!byIpId.has(key)) {
        byIpId.set(key, toMarketplaceAssetFromLocal(local, address ?? ""));
      }
    }
    return Array.from(byIpId.values()).sort(
      (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
    );
  }, [address, localPublished, remoteAssets]);

  const loadLocalProjects = async () => {
    setIsLoadingLocal(true);
    try {
      const projects = (await listProjects()) as ProjectState[];
      setLocalProjects(projects ?? []);
    } finally {
      setIsLoadingLocal(false);
    }
  };

  const loadRemoteAssets = async () => {
    if (!address) {
      setRemoteAssets([]);
      setIsLoadingRemote(false);
      setRemoteError(null);
      return;
    }

    setIsLoadingRemote(true);
    setRemoteError(null);
    try {
      const { ipAssets } = await fetchConvexIpAssets({ wallet: address });
      setRemoteAssets((ipAssets ?? []) as MarketplaceAsset[]);
    } catch (err: any) {
      setRemoteAssets([]);
      setRemoteError(err?.message ?? "Failed to load assets from Convex.");
    } finally {
      setIsLoadingRemote(false);
    }
  };

  useEffect(() => {
    void loadLocalProjects();
  }, []);

  useEffect(() => {
    if (!address) return;
    void loadRemoteAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handleSyncLocalToConvex = async () => {
    if (!address) return;
    if (!localPublished.length) {
      setSyncStatus("error");
      setSyncMessage("No locally published exports found to sync.");
      return;
    }

    setSyncStatus("syncing");
    setSyncMessage("Syncing local published assets to Convex…");
    try {
      for (const item of localPublished) {
        await createConvexIpAsset({
          wallet: address,
          localProjectId: item.projectId,
          projectTitle: item.projectName,
          ipId: item.publish.ipId,
          title: item.publish.title,
          summary: item.publish.summary,
          terms: item.publish.terms,
          videoUrl: item.publish.videoUrl,
          thumbnailUrl: item.publish.thumbnailUrl,
          licenseTermsId: item.publish.licenseTermsId,
          txHash: item.publish.txHash,
          chainId: clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
          ipMetadataUri: item.publish.ipMetadataUri,
          ipMetadataHash: item.publish.ipMetadataHash,
          nftMetadataUri: item.publish.nftMetadataUri,
          nftMetadataHash: item.publish.nftMetadataHash,
          videoKey: item.publish.videoKey,
          thumbnailKey: item.publish.thumbnailKey,
        });
      }

      setSyncStatus("success");
      setSyncMessage("Synced local publishes to Convex.");
      await loadRemoteAssets();
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      setSyncMessage(err?.message ?? "Convex sync failed.");
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>Connect your wallet to view published assets.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => openConnectModal?.()}>Connect wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = isLoadingLocal || isLoadingRemote;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Creator library</p>
          <h1 className="text-4xl font-semibold text-foreground">Assets</h1>
          <p className="text-muted-foreground">
            Published IP assets registered on Story Protocol and synced to the Cliplore marketplace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void loadRemoteAssets()}
            disabled={isLoadingRemote}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => void handleSyncLocalToConvex()}
            disabled={syncStatus === "syncing" || !localPublished.length}
          >
            <UploadCloud className="h-4 w-4" />
            Sync local publishes
          </Button>
        </div>
      </div>

      {remoteError ? (
        <Card>
          <CardHeader>
            <CardTitle>Marketplace sync unavailable</CardTitle>
            <CardDescription>
              {remoteError} — confirm `NEXT_PUBLIC_CONVEX_URL` points to your deployment.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="overflow-hidden">
              <div className="aspect-video border-b border-border bg-muted" />
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardFooter className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : mergedAssets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No published assets yet</CardTitle>
            <CardDescription>
              Publish an export to register an IP asset and it will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/projects">Open projects</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/explore">Explore marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mergedAssets.map((asset) => (
            <Card key={asset.ipId} className="overflow-hidden">
              <div className="aspect-video overflow-hidden border-b border-border bg-black">
                {asset.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.thumbnailUrl}
                    alt={`${asset.title} thumbnail`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    No thumbnail
                  </div>
                )}
              </div>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="truncate text-xl">{asset.title}</CardTitle>
                  <Badge variant="outline" className="font-mono">
                    {asset.ipId.slice(0, 6)}…{asset.ipId.slice(-4)}
                  </Badge>
                </div>
                <CardDescription>{asset.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                  {asset.terms}
                </p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/assets/${encodeURIComponent(asset.ipId)}`}>
                    Open dashboard
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={
                      asset.assetKind === "dataset"
                        ? `/datasets/${encodeURIComponent(asset.ipId)}`
                        : `/ip/${encodeURIComponent(asset.ipId)}`
                    }
                  >
                    Public page
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={getStoryIpaExplorerUrl({ ipId: asset.ipId })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Explorer
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
