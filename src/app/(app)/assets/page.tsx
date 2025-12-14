"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import { listProjects } from "@/app/store";
import type { ProjectState } from "@/app/types";
import {
  fetchConvexIpAssets,
  setConvexIpAssetArchived,
  upsertConvexIpAsset,
} from "@/lib/api/convex";
import { clientEnv } from "@/lib/env/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatShortHash } from "@/lib/utils";
import {
  Archive,
  Cloud,
  Filter,
  HardDrive,
  RefreshCw,
  Search,
  UploadCloud,
  Wallet,
  XCircle,
} from "lucide-react";
import AssetCard from "./AssetCard";
import type { AssetRow, LocalPublishedAsset, MarketplaceAsset } from "./types";

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
    archived: false,
    archivedAt: null,
    archivedBy: null,
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

type SortKey = "newest" | "oldest";
type SourceFilter = "all" | "listed" | "local-only" | "remote-only";
type KindFilter = "all" | "video" | "dataset";
type ArchiveView = "active" | "archived";

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function normalizeAssetKind(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "dataset" ? "dataset" : "video";
}

export default function AssetsPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [localProjects, setLocalProjects] = useState<ProjectState[]>([]);
  const [remoteAssets, setRemoteAssets] = useState<MarketplaceAsset[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);
  const [isLoadingRemote, setIsLoadingRemote] = useState(true);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [archiveView, setArchiveView] = useState<ArchiveView>("active");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const localPublished = useMemo(
    () => collectLocalPublishedAssets(localProjects),
    [localProjects],
  );

  const mergedRows = useMemo(() => {
    const rows = new Map<string, AssetRow>();

    for (const asset of remoteAssets) {
      const key = asset.ipId.toLowerCase();
      rows.set(key, {
        asset,
        hasLocal: false,
        hasRemote: true,
      });
    }

    for (const local of localPublished) {
      const key = local.publish.ipId.toLowerCase();
      const existing = rows.get(key);
      if (existing) {
        existing.hasLocal = true;
        existing.local = local;
        continue;
      }

      rows.set(key, {
        asset: toMarketplaceAssetFromLocal(local, address ?? ""),
        hasLocal: true,
        hasRemote: false,
        local,
      });
    }

    return Array.from(rows.values()).sort(
      (a, b) =>
        (b.asset.updatedAt ?? b.asset.createdAt) -
        (a.asset.updatedAt ?? a.asset.createdAt),
    );
  }, [address, localPublished, remoteAssets]);

  const archiveCounts = useMemo(() => {
    const archived = mergedRows.filter(
      (row) => row.hasRemote && Boolean(row.asset.archived),
    ).length;
    return {
      archived,
      active: mergedRows.length - archived,
    };
  }, [mergedRows]);

  const viewRows = useMemo(() => {
    if (archiveView === "archived") {
      return mergedRows.filter((row) => row.hasRemote && Boolean(row.asset.archived));
    }

    return mergedRows.filter((row) => !(row.hasRemote && Boolean(row.asset.archived)));
  }, [archiveView, mergedRows]);

  const normalizedQuery = normalizeQuery(query);

  const filteredRows = useMemo(() => {
    let out = viewRows;

    if (kindFilter !== "all") {
      out = out.filter(
        (row) => normalizeAssetKind(row.asset.assetKind) === kindFilter,
      );
    }

    if (sourceFilter !== "all") {
      out = out.filter((row) => {
        if (sourceFilter === "listed") return row.hasRemote;
        if (sourceFilter === "local-only")
          return row.hasLocal && !row.hasRemote;
        return row.hasRemote && !row.hasLocal;
      });
    }

    if (normalizedQuery) {
      out = out.filter((row) => {
        const haystack = [
          row.asset.title,
          row.asset.summary,
          row.asset.terms,
          row.asset.ipId,
          row.asset.licensorWallet,
          row.asset.txHash ?? "",
          row.asset.licenseTermsId ?? "",
          row.asset.assetKind ?? "",
          row.asset.datasetType ?? "",
          ...(row.asset.tags ?? []),
          row.local?.projectName ?? "",
          row.local?.exportName ?? "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      });
    }

    const sorted = [...out].sort((a, b) => {
      const aValue = a.asset.updatedAt ?? a.asset.createdAt;
      const bValue = b.asset.updatedAt ?? b.asset.createdAt;
      return sortKey === "newest" ? bValue - aValue : aValue - bValue;
    });

    return sorted;
  }, [kindFilter, normalizedQuery, sortKey, sourceFilter, viewRows]);

  const counts = useMemo(() => {
    const total = viewRows.length;
    const listed = viewRows.filter((row) => row.hasRemote).length;
    const localOnly = viewRows.filter(
      (row) => row.hasLocal && !row.hasRemote,
    ).length;
    const remoteOnly = viewRows.filter(
      (row) => row.hasRemote && !row.hasLocal,
    ).length;
    return { total, listed, localOnly, remoteOnly };
  }, [viewRows]);

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
      const { ipAssets } = await fetchConvexIpAssets({
        wallet: address,
        includeArchived: true,
      });
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/") return;

      const activeTag =
        (document.activeElement as HTMLElement | null)?.tagName ?? "";
      const isTypingTarget =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeTag === "SELECT";
      if (isTypingTarget) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!address) return;
    void loadRemoteAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    if (archiveView === "archived" && sourceFilter === "local-only") {
      setSourceFilter("listed");
    }
  }, [archiveView, sourceFilter]);

  const refreshAll = async () => {
    await Promise.all([loadLocalProjects(), loadRemoteAssets()]);
  };

  const handleSetArchived = async (input: { ipId: string; archived: boolean }) => {
    if (!address) return false;

    try {
      await setConvexIpAssetArchived({
        wallet: address,
        ipId: input.ipId,
        archived: input.archived,
      });

      const now = Date.now();
      setRemoteAssets((prev) =>
        prev.map((asset) =>
          asset.ipId.toLowerCase() === input.ipId.toLowerCase()
            ? {
                ...asset,
                archived: input.archived,
                archivedAt: input.archived ? now : null,
                archivedBy: input.archived ? address : null,
                updatedAt: now,
              }
            : asset,
        ),
      );

      toast.success(input.archived ? "Asset archived" : "Asset restored");
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to update archive status.");
      return false;
    }
  };

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
        await upsertConvexIpAsset({
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
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Assets
            </CardTitle>
            <CardDescription>
              Connect your wallet to view assets you’ve published from Cliplore,
              plus any marketplace listings synced via Convex.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => openConnectModal?.()}>
              <Wallet />
              Connect wallet
            </Button>
            <Button asChild variant="outline">
              <Link href="/explore">
                <Cloud />
                Explore marketplace
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = isLoadingLocal || isLoadingRemote;
  const showEmptyResults =
    !isLoading && viewRows.length > 0 && filteredRows.length === 0;
  const showAnyFilters =
    normalizedQuery.length > 0 ||
    kindFilter !== "all" ||
    sourceFilter !== "all";
  const activeFilterCount =
    (normalizedQuery.length > 0 ? 1 : 0) +
    (kindFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (sortKey !== "newest" ? 1 : 0);

  const syncVariant =
    syncStatus === "error"
      ? "destructive"
      : syncStatus === "success"
        ? "success"
        : syncStatus === "syncing"
          ? "info"
          : "default";

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Creator library</p>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                Assets
              </h1>
              <Badge variant="outline" className="font-mono">
                Wallet: {formatShortHash(address)}
              </Badge>
            </div>
            <p className="max-w-3xl text-muted-foreground">
              Your published IP assets, with optional marketplace listing sync
              via Convex. Use filters to quickly find local-only exports that
              need syncing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void refreshAll()}
              disabled={isLoading}
            >
              <RefreshCw
                className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </Button>
            <Button
              onClick={() => void handleSyncLocalToConvex()}
              disabled={syncStatus === "syncing" || !localPublished.length}
            >
              <UploadCloud
                className={
                  syncStatus === "syncing" ? "h-4 w-4 animate-spin" : "h-4 w-4"
                }
              />
              Sync local publishes
            </Button>
          </div>
        </div>

        {remoteError ? (
          <Alert variant="destructive">
            <AlertTitle>Marketplace sync unavailable</AlertTitle>
            <AlertDescription>
              {remoteError} — confirm `NEXT_PUBLIC_CONVEX_URL` points to your
              deployment.
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadRemoteAssets()}
                  disabled={isLoadingRemote}
                >
                  <RefreshCw
                    className={
                      isLoadingRemote ? "h-4 w-4 animate-spin" : "h-4 w-4"
                    }
                  />
                  Retry
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/explore">
                    <Cloud className="h-4 w-4" />
                    Explore marketplace
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {syncMessage ? (
          <Alert variant={syncVariant}>
            <AlertTitle>Sync status</AlertTitle>
            <AlertDescription>{syncMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, terms, IP ID, tx hash, or local project…"
                  className="pl-9"
                  aria-label="Search assets"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Tabs
                  value={archiveView}
                  onValueChange={(value) => setArchiveView(value as ArchiveView)}
                >
                  <TabsList>
                    <TabsTrigger value="active" className="gap-2">
                      Active
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                        {archiveCounts.active}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="gap-2">
                      Archived
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                        {archiveCounts.archived}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4" />
                      Filters
                      {activeFilterCount ? ` (${activeFilterCount})` : ""}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Asset kind</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={kindFilter}
                      onValueChange={(value) =>
                        setKindFilter(value as KindFilter)
                      }
                    >
                      <DropdownMenuRadioItem value="all">
                        All
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="video">
                        Video
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dataset">
                        Dataset
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Source</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={sourceFilter}
                      onValueChange={(value) =>
                        setSourceFilter(value as SourceFilter)
                      }
                    >
                      <DropdownMenuRadioItem value="all">
                        All
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="listed">
                        Listed (Convex)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="local-only"
                        disabled={archiveView === "archived"}
                      >
                        Local only
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="remote-only">
                        Remote only
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Sort</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={sortKey}
                      onValueChange={(value) => setSortKey(value as SortKey)}
                    >
                      <DropdownMenuRadioItem value="newest">
                        Newest
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="oldest">
                        Oldest
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Badge variant="outline" className="tabular-nums">
                  {filteredRows.length}{" "}
                  {filteredRows.length === 1 ? "asset" : "assets"}
                </Badge>

                <Badge variant="outline" className="tabular-nums gap-1.5">
                  <Cloud className="h-3.5 w-3.5" /> {counts.listed}
                </Badge>
                <Badge variant="outline" className="tabular-nums gap-1.5">
                  <HardDrive className="h-3.5 w-3.5" /> {counts.localOnly}
                </Badge>

                {showAnyFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setKindFilter("all");
                      setSourceFilter("all");
                      setSortKey("newest");
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="overflow-hidden">
                <div className="aspect-video border-b border-border bg-muted" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mergedRows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No published assets yet</CardTitle>
              <CardDescription>
                Publish an export to register an IP asset and it will appear
                here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/projects">
                  <HardDrive />
                  Open projects
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/explore">
                  <Cloud />
                  Explore marketplace
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/datasets/new">
                  <UploadCloud />
                  Publish a dataset
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : viewRows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {archiveView === "archived"
                  ? "No archived assets"
                  : "No active assets"}
              </CardTitle>
              <CardDescription>
                {archiveView === "archived"
                  ? "Archived assets stay hidden from Explore. Archive an asset from the Active tab to keep the marketplace tidy."
                  : "Archived assets are hidden from this view. Switch to Archived to review or restore them."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setArchiveView(archiveView === "archived" ? "active" : "archived")}
              >
                <Archive />
                {archiveView === "archived" ? "View active assets" : "View archived"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/explore">
                  <Cloud />
                  Explore marketplace
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : showEmptyResults ? (
          <Card>
            <CardHeader>
              <CardTitle>No matching assets</CardTitle>
              <CardDescription>
                Clear filters to see everything in your library.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setKindFilter("all");
                  setSourceFilter("all");
                  setSortKey("newest");
                }}
              >
                <XCircle />
                Clear filters
              </Button>
              <Button asChild variant="outline">
                <Link href="/explore">
                  <Cloud />
                  Explore marketplace
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRows.map((row) => (
              <AssetCard
                key={row.asset.ipId}
                row={row}
                viewerWallet={address}
                onSetArchived={handleSetArchived}
              />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
