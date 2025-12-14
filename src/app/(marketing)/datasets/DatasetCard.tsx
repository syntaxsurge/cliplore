"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { formatBytes, formatShortHash, ipfsUriToGatewayUrl } from "@/lib/utils";
import {
  AlignLeft,
  Database,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Music,
  Play,
  Tag,
  Wallet,
} from "lucide-react";
import type { DatasetMarketplaceAsset } from "./types";

function ExternalLinkIconButton(props: { href: string; label: string }) {
  const { href, label } = props;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <a href={href} target="_blank" rel="noreferrer" aria-label={label}>
            <ExternalLink />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function getSampleKind(mime: string | null) {
  const value = mime ?? "";
  if (value.startsWith("video/")) return "video";
  if (value.startsWith("audio/")) return "audio";
  if (value.startsWith("image/")) return "image";
  if (value) return "file";
  return "file";
}

export default function DatasetCard(props: { dataset: DatasetMarketplaceAsset }) {
  const { dataset } = props;
  const mediaUrl = useMemo(() => ipfsUriToGatewayUrl(dataset.videoUrl), [dataset.videoUrl]);
  const thumbnailUrl = useMemo(
    () => (dataset.thumbnailUrl ? ipfsUriToGatewayUrl(dataset.thumbnailUrl) : null),
    [dataset.thumbnailUrl],
  );
  const storyExplorerUrl = useMemo(
    () =>
      getStoryIpaExplorerUrl({
        ipId: dataset.ipId,
        chainId: dataset.chainId ?? undefined,
      }),
    [dataset.chainId, dataset.ipId],
  );
  const sampleKind = useMemo(() => getSampleKind(dataset.mediaMimeType), [dataset.mediaMimeType]);

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
            alt={`${dataset.title} cover`}
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Database className="size-5" />
            No cover image
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Preview ${dataset.title}`}
            >
              <span className="rounded-full border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur-sm opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
                <SampleIcon className="size-5" />
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl overflow-hidden p-0">
            <div className="border-b border-border px-6 py-4">
              <DialogHeader>
                <DialogTitle className="text-lg">{dataset.title}</DialogTitle>
                <DialogDescription className="max-w-prose">
                  {dataset.summary}
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
                <img src={mediaUrl} alt={dataset.title} className="h-full w-full object-contain" />
              ) : (
                <div className="flex flex-col items-start gap-3 p-6">
                  <p className="text-sm text-muted-foreground">
                    This sample isn’t previewable in-browser. Open the file to inspect it locally.
                  </p>
                  <Button asChild>
                    <a href={mediaUrl} target="_blank" rel="noreferrer">
                      Open sample file
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
              <Badge variant="outline" className="font-mono">
                IP: {formatShortHash(dataset.ipId)}
              </Badge>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/datasets/${encodeURIComponent(dataset.ipId)}`}>
                    <Eye />
                    View details
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={mediaUrl} target="_blank" rel="noreferrer">
                    <FileText />
                    Open file
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0 truncate text-xl">{dataset.title}</CardTitle>
          <Badge variant="outline" className="shrink-0 font-mono">
            {formatShortHash(dataset.ipId)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {dataset.datasetType ? <Badge>{dataset.datasetType}</Badge> : null}
          {dataset.mediaMimeType ? <Badge variant="outline">{dataset.mediaMimeType}</Badge> : null}
          {typeof dataset.mediaSizeBytes === "number" ? (
            <Badge variant="outline">{formatBytes(dataset.mediaSizeBytes)}</Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-1">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <AlignLeft className="size-3.5" />
            Description
          </p>
          <p className="text-sm text-foreground/90">{dataset.summary}</p>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" />
              License terms
            </p>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
              {dataset.terms}
            </p>
          </div>

          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Wallet className="size-3.5" />
              Creator wallet
            </p>
            <div className="flex items-center gap-2">
              <code
                className="max-w-full truncate rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs"
                title={dataset.licensorWallet}
              >
                {dataset.licensorWallet}
              </code>
              <CopyIconButton value={dataset.licensorWallet} label="Copy creator wallet" />
            </div>
          </div>

          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Database className="size-3.5" />
              IP Asset ID
            </p>
            <div className="flex items-center gap-2">
              <code
                className="max-w-full truncate rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs"
                title={dataset.ipId}
              >
                {dataset.ipId}
              </code>
              <CopyIconButton value={dataset.ipId} label="Copy IP Asset ID" />
              <ExternalLinkIconButton href={storyExplorerUrl} label="Open in Story Explorer" />
            </div>
          </div>

          {dataset.tags?.length ? (
            <div className="grid gap-1">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Tag className="size-3.5" />
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {dataset.tags.slice(0, 6).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link href={`/datasets/${encodeURIComponent(dataset.ipId)}`}>
            <Eye />
            View details
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={mediaUrl} target="_blank" rel="noreferrer">
            <FileText />
            Open sample
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

