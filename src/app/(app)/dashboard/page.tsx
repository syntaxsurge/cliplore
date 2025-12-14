"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import { ExternalLinkIconButton } from "@/components/data-display/ExternalLinkIconButton";
import { TruncatedCode } from "@/components/data-display/TruncatedCode";
import { clientEnv } from "@/lib/env/client";
import {
  fetchConvexIpAssets,
  fetchConvexProjects,
} from "@/lib/api/convex";
import { listProjects } from "@/app/store";
import { ProjectState } from "@/app/types";
import { collectLocalPublishedAssets, mergeCreatorAssetRows } from "@/lib/ip-assets/creator";
import type { MarketplaceAsset } from "@/lib/ip-assets/types";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { formatShortHash } from "@/lib/utils";
import {
  ArrowRight,
  Cloud,
  FolderPlus,
  LayoutDashboard,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";

type RemoteProject = {
  id: string;
  localId: string | null;
  title: string;
};

function formatLocalDate(value: string | number) {
  try {
    const date =
      typeof value === "number" ? new Date(value) : new Date(Date.parse(value));
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function DashboardPage() {
  const { address } = useAccount();
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [remoteProjects, setRemoteProjects] = useState<RemoteProject[]>([]);
  const [remoteAssets, setRemoteAssets] = useState<MarketplaceAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const localProjects = await listProjects();
        if (cancelled) return;
        setProjects(localProjects);

        if (!address) return;

        const [{ projects: convexProjects }, { ipAssets }] = await Promise.all([
          fetchConvexProjects(address),
          fetchConvexIpAssets({ wallet: address, includeArchived: true }),
        ]);
        if (cancelled) return;

        setRemoteProjects((convexProjects ?? []) as RemoteProject[]);
        setRemoteAssets((ipAssets ?? []) as MarketplaceAsset[]);

        // Merge remote metadata titles into local projects if present
        if (convexProjects?.length) {
          setProjects((prev) =>
            prev.map((project) => {
              const match = convexProjects.find(
                (remoteProject: any) => remoteProject.localId === project.id,
              );
              if (match?.title && match.title !== project.projectName) {
                return { ...project, projectName: match.title };
              }
              return project;
            }),
          );
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const walletLabel = useMemo(
    () => (address ? formatShortHash(address) : null),
    [address],
  );

  const sortedProjects = useMemo(() => {
    return [...projects].sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
    );
  }, [projects]);

  const localPublished = useMemo(() => collectLocalPublishedAssets(projects), [projects]);

  const assetRows = useMemo(() => {
    return mergeCreatorAssetRows({
      localPublished,
      remoteAssets,
      wallet: address ?? "",
      chainId: clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
    });
  }, [address, localPublished, remoteAssets]);

  const assetCounts = useMemo(() => {
    const total = assetRows.length;
    const listed = assetRows.filter((row) => row.hasRemote && !row.asset.archived).length;
    const archived = assetRows.filter((row) => row.hasRemote && row.asset.archived).length;
    const localOnly = assetRows.filter((row) => row.hasLocal && !row.hasRemote).length;
    return { total, listed, archived, localOnly };
  }, [assetRows]);

  const recentAssetRows = useMemo(() => assetRows.slice(0, 6), [assetRows]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Creator workspace</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h1>
            {walletLabel ? (
              <Badge variant="outline" className="font-mono">
                <Wallet className="h-3.5 w-3.5" />
                {walletLabel}
              </Badge>
            ) : null}
          </div>
          <p className="max-w-3xl text-muted-foreground">
            Create projects, publish IP assets to Story, and manage marketplace listings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/projects?create=1">
              <FolderPlus />
              New project
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/projects">
              <Sparkles />
              Open studio
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard unavailable</AlertTitle>
          <AlertDescription>
            {error} — confirm `NEXT_PUBLIC_CONVEX_URL` points to your deployment.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-semibold">{projects.length}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Synced to Convex: {remoteProjects.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              IP assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-semibold">{assetCounts.total}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Local-only: {assetCounts.localOnly}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-muted-foreground" />
              Marketplace listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-semibold">{assetCounts.listed}</p>
            )}
            <p className="text-sm text-muted-foreground">Archived: {assetCounts.archived}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="projects" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="assets">IP assets</TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : sortedProjects.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-muted/30 p-6">
                    <p className="text-sm text-muted-foreground">
                      No projects yet. Create one to start generating and editing clips.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild>
                        <Link href="/projects?create=1">
                          <FolderPlus />
                          New project
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/explore">
                          <Cloud />
                          Explore marketplace
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {sortedProjects.slice(0, 6).map((project) => (
                      <Card
                        key={project.id}
                        className="overflow-hidden transition-shadow duration-200 ease-out hover:shadow-md motion-reduce:transition-none"
                      >
                        <CardHeader className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <CardTitle className="min-w-0 truncate text-lg">
                              {project.projectName}
                            </CardTitle>
                            <Badge variant="outline" className="shrink-0">
                              Local draft
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Updated {formatLocalDate(project.lastModified)}
                          </p>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/projects/${project.id}`}>
                              <Sparkles />
                              Open editor
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href="/projects">
                              Open projects
                              <ArrowRight />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assets" className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : recentAssetRows.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-muted/30 p-6">
                    <p className="text-sm text-muted-foreground">
                      No published IP assets found yet. Publish an export to Story to get an IP ID,
                      then optionally sync it to the marketplace.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild>
                        <Link href="/assets">
                          <LayoutDashboard />
                          Open IP assets
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/projects">
                          <Sparkles />
                          Open studio
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentAssetRows.map((row) => {
                      const asset = row.asset;
                      const dashboardHref = `/assets/${encodeURIComponent(asset.ipId)}`;
                      const explorerHref = getStoryIpaExplorerUrl({
                        ipId: asset.ipId,
                        chainId: asset.chainId ?? undefined,
                      });
                      const kindLabel =
                        (asset.assetKind ?? "video").toLowerCase() === "dataset"
                          ? "Dataset"
                          : "Video";

                      const listingStatus = row.hasRemote
                        ? asset.archived
                          ? { variant: "outline" as const, label: "Archived" }
                          : { variant: "success" as const, label: "Listed" }
                        : { variant: "warning" as const, label: "Local-only" };

                      return (
                        <div
                          key={asset.ipId}
                          className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="min-w-0 truncate font-medium text-foreground">
                                {asset.title}
                              </p>
                              <Badge variant="outline">{kindLabel}</Badge>
                              <Badge variant={listingStatus.variant}>{listingStatus.label}</Badge>
                            </div>

                            <div className="flex min-w-0 items-center gap-2 text-sm">
                              <TruncatedCode value={asset.ipId} />
                              <CopyIconButton value={asset.ipId} label="Copy IP Asset ID" />
                              <ExternalLinkIconButton
                                href={explorerHref}
                                label="Open in Story Explorer"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="secondary">
                              <Link href={dashboardHref}>
                                <LayoutDashboard />
                                Dashboard
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="secondary" className="justify-between">
              <Link href="/projects">
                <span className="flex items-center gap-2">
                  <Sparkles />
                  Open studio
                </span>
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/assets">
                <span className="flex items-center gap-2">
                  <LayoutDashboard />
                  View IP assets
                </span>
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/explore">
                <span className="flex items-center gap-2">
                  <Cloud />
                  Explore marketplace
                </span>
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/settings">
                <span className="flex items-center gap-2">
                  <Settings />
                  Settings
                </span>
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
