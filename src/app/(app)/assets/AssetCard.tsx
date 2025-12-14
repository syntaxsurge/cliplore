"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import { ExternalLinkIconButton } from "@/components/data-display/ExternalLinkIconButton";
import { TruncatedCode } from "@/components/data-display/TruncatedCode";
import {
  getStoryIpaExplorerUrl,
  getStoryTxExplorerUrl,
} from "@/lib/story/explorer";
import { formatBytes, formatShortHash, ipfsUriToGatewayUrl } from "@/lib/utils";
import {
  AlignLeft,
  Archive,
  Database,
  FileText,
  Globe,
  Hash,
  Image as ImageIcon,
  LayoutDashboard,
  MoreVertical,
  Music,
  Play,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react";
import type { AssetRow } from "./types";

function getSampleKind(mime: string | null) {
  const value = mime ?? "";
  if (value.startsWith("video/")) return "video";
  if (value.startsWith("audio/")) return "audio";
  if (value.startsWith("image/")) return "image";
  if (value) return "file";
  return "file";
}

function formatLocalDate(value: number) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AssetCard(props: {
  row: AssetRow;
  viewerWallet?: string;
  onSetArchived?: (input: { ipId: string; archived: boolean }) => Promise<boolean>;
}) {
  const { row, viewerWallet, onSetArchived } = props;
  const assetKind = (row.asset.assetKind ?? "video").toLowerCase();
  const isDataset = assetKind === "dataset";
  const isArchived = Boolean(row.asset.archived);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);

  const canManageArchive =
    row.hasRemote &&
    Boolean(viewerWallet) &&
    viewerWallet!.toLowerCase() === row.asset.licensorWallet.toLowerCase() &&
    typeof onSetArchived === "function";
  const mediaUrl = useMemo(
    () => ipfsUriToGatewayUrl(row.asset.videoUrl),
    [row.asset.videoUrl],
  );
  const thumbnailUrl = useMemo(
    () =>
      row.asset.thumbnailUrl
        ? ipfsUriToGatewayUrl(row.asset.thumbnailUrl)
        : null,
    [row.asset.thumbnailUrl],
  );
  const storyIpaUrl = useMemo(
    () =>
      getStoryIpaExplorerUrl({
        ipId: row.asset.ipId,
        chainId: row.asset.chainId ?? undefined,
      }),
    [row.asset.chainId, row.asset.ipId],
  );
  const storyTxUrl = useMemo(() => {
    if (!row.asset.txHash) return null;
    return getStoryTxExplorerUrl({
      txHash: row.asset.txHash,
      chainId: row.asset.chainId ?? undefined,
    });
  }, [row.asset.chainId, row.asset.txHash]);

  const publicHref =
    assetKind === "dataset"
      ? `/datasets/${encodeURIComponent(row.asset.ipId)}`
      : `/ip/${encodeURIComponent(row.asset.ipId)}`;
  const dashboardHref = `/assets/${encodeURIComponent(row.asset.ipId)}`;
  const remixHref = `/projects?parentIp=${encodeURIComponent(row.asset.ipId)}`;

  const status = isArchived
    ? { variant: "outline" as const, label: "Archived" }
    : row.hasRemote
      ? { variant: "success" as const, label: "Listed" }
      : row.hasLocal
        ? { variant: "warning" as const, label: "Local only" }
        : { variant: "outline" as const, label: "Unverified" };

  const updatedAt = row.asset.updatedAt ?? row.asset.createdAt;
  const updatedLabel = updatedAt ? formatLocalDate(updatedAt) : "";
  const sampleKind = useMemo(
    () => (isDataset ? getSampleKind(row.asset.mediaMimeType ?? "") : "video"),
    [isDataset, row.asset.mediaMimeType],
  );

  const SampleIcon =
    sampleKind === "video"
      ? Play
      : sampleKind === "audio"
        ? Music
        : sampleKind === "image"
          ? ImageIcon
          : Database;

  return (
    <Card className="group overflow-hidden transition-shadow duration-200 ease-out hover:shadow-md motion-reduce:transition-none">
      <div className="relative aspect-video overflow-hidden border-b border-border bg-muted">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={`${row.asset.title} thumbnail`}
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            {isDataset ? (
              <Database className="size-5" />
            ) : (
              <Play className="size-5" />
            )}
            No thumbnail
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Preview ${row.asset.title}`}
            >
              <span className="rounded-full border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur-sm opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
                <SampleIcon className="size-5" />
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl overflow-hidden p-0">
            <div className="border-b border-border px-6 py-4">
              <DialogHeader>
                <DialogTitle className="text-lg">{row.asset.title}</DialogTitle>
                <DialogDescription className="max-w-prose">
                  {row.asset.summary}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="border-b border-border bg-black">
              {sampleKind === "video" ? (
                <div className="aspect-video">
                  <video
                    src={mediaUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full"
                  />
                </div>
              ) : sampleKind === "audio" ? (
                <div className="p-6">
                  <audio src={mediaUrl} controls className="w-full" />
                </div>
              ) : sampleKind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt={row.asset.title}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-start gap-3 p-6">
                  <p className="text-sm text-muted-foreground">
                    This file isn’t previewable in-browser. Open it to inspect
                    it locally.
                  </p>
                  <Button asChild>
                    <a href={mediaUrl} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-mono">
                  IP: {formatShortHash(row.asset.ipId)}
                </Badge>
                <Badge variant={status.variant}>{status.label}</Badge>
                <Badge variant="outline">
                  {isDataset ? "Dataset" : "Video"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={dashboardHref}>
                    <LayoutDashboard />
                    Dashboard
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={publicHref}>
                    <Globe />
                    Public page
                  </Link>
                </Button>
                {!isDataset ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={remixHref}>
                      <Sparkles />
                      Remix
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0 truncate text-xl">
            {row.asset.title}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Open asset actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={dashboardHref}
                    className="flex w-full items-center gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Open dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={publicHref}
                    className="flex w-full items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Public page
                  </Link>
                </DropdownMenuItem>
                {!isDataset ? (
                  <DropdownMenuItem asChild>
                    <Link
                      href={remixHref}
                      className="flex w-full items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Remix
                    </Link>
                  </DropdownMenuItem>
                ) : null}

                {canManageArchive ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setArchiveDialogOpen(true)}
                      className={
                        isArchived
                          ? "text-emerald-700 focus:bg-emerald-600 focus:text-white dark:text-emerald-300 dark:focus:bg-emerald-500"
                          : "text-red-600 focus:bg-red-600 focus:text-white dark:text-red-300 dark:focus:bg-red-500"
                      }
                    >
                      <Archive className="h-4 w-4" />
                      {isArchived ? "Restore from archive" : "Archive"}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            {canManageArchive ? (
              <AlertDialog
                open={archiveDialogOpen}
                onOpenChange={(open) => {
                  if (archiveSubmitting) return;
                  setArchiveDialogOpen(open);
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isArchived ? "Restore this asset?" : "Archive this asset?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isArchived
                        ? "Restoring makes this asset visible in Explore again."
                        : "Archiving hides this asset from the Explore marketplace."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="grid gap-3 text-sm">
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <p className="font-medium text-foreground">
                        {row.asset.title}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {row.asset.ipId}
                      </p>
                    </div>

                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      <li>Removes it from marketplace lists (Explore / Datasets).</li>
                      <li>Keeps the on-chain Story registration unchanged.</li>
                      <li>Still accessible via direct links and your dashboard.</li>
                      <li>You can restore it anytime from the Archived tab.</li>
                    </ul>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={archiveSubmitting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={archiveSubmitting}
                      className={
                        isArchived
                          ? "bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-500 dark:hover:bg-emerald-500/90"
                          : `${buttonVariants({ variant: "destructive" })} bg-red-600 hover:bg-red-600/90 dark:bg-red-500 dark:hover:bg-red-500/90`
                      }
                      onClick={async (event) => {
                        event.preventDefault();
                        if (!onSetArchived) return;
                        setArchiveSubmitting(true);
                        try {
                          const ok = await onSetArchived({
                            ipId: row.asset.ipId,
                            archived: !isArchived,
                          });
                          if (ok) setArchiveDialogOpen(false);
                        } finally {
                          setArchiveSubmitting(false);
                        }
                      }}
                    >
                      {archiveSubmitting
                        ? "Working…"
                        : isArchived
                          ? "Restore"
                          : "Archive"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant="outline">{isDataset ? "Dataset" : "Video"}</Badge>
          {updatedLabel ? (
            <Badge variant="outline" className="tabular-nums">
              Updated {updatedLabel}
            </Badge>
          ) : null}
          {isDataset && row.asset.datasetType ? (
            <Badge>{row.asset.datasetType}</Badge>
          ) : null}
          {isDataset && row.asset.mediaMimeType ? (
            <Badge variant="outline">{row.asset.mediaMimeType}</Badge>
          ) : null}
          {isDataset && typeof row.asset.mediaSizeBytes === "number" ? (
            <Badge variant="outline">
              {formatBytes(row.asset.mediaSizeBytes)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-1">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <AlignLeft className="size-3.5" />
            Description
          </p>
          <p className="text-sm text-foreground/90">{row.asset.summary}</p>
        </div>

        {row.local ? (
          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" />
              Local origin
            </p>
            <p className="text-sm text-foreground/90">
              {row.local.projectName} • {row.local.exportName}
            </p>
          </div>
        ) : null}

        <div className="grid gap-3 text-sm">
          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Database className="size-3.5" />
              IP Asset ID
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <TruncatedCode value={row.asset.ipId} />
              <CopyIconButton value={row.asset.ipId} label="Copy IP Asset ID" />
              <ExternalLinkIconButton
                href={storyIpaUrl}
                label="Open in Story Explorer"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Wallet className="size-3.5" />
              Creator wallet
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <TruncatedCode value={row.asset.licensorWallet} />
              <CopyIconButton
                value={row.asset.licensorWallet}
                label="Copy creator wallet"
              />
            </div>
          </div>

          {row.asset.txHash ? (
            <div className="grid gap-1">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Hash className="size-3.5" />
                Registration tx
              </p>
              <div className="flex min-w-0 items-center gap-2">
                <TruncatedCode value={row.asset.txHash} />
                {storyTxUrl ? (
                  <ExternalLinkIconButton
                    href={storyTxUrl}
                    label="Open tx in Story Explorer"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" />
              License terms
            </p>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
              {row.asset.terms}
            </p>
          </div>

          {isDataset && row.asset.tags?.length ? (
            <div className="grid gap-1">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Tag className="size-3.5" />
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {row.asset.tags.slice(0, 6).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
