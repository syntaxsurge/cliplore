"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
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
import { ipfsUriToGatewayUrl } from "@/lib/utils";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import {
  AlignLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Fingerprint,
  Play,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { ExploreAsset } from "./types";

function formatShortHash(value: string) {
  if (!value) return value;
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function CopyIconButton(props: { value: string; label: string }) {
  const { value, label } = props;
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Couldn’t copy to clipboard");
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopy}
          aria-label={label}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : label}</TooltipContent>
    </Tooltip>
  );
}

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

export default function IpAssetCard(props: { asset: ExploreAsset }) {
  const { asset } = props;
  const previewVideoUrl = useMemo(
    () => ipfsUriToGatewayUrl(asset.videoUrl),
    [asset.videoUrl],
  );
  const previewThumbnailUrl = useMemo(
    () => (asset.thumbnailUrl ? ipfsUriToGatewayUrl(asset.thumbnailUrl) : null),
    [asset.thumbnailUrl],
  );
  const storyExplorerUrl = useMemo(
    () =>
      getStoryIpaExplorerUrl({
        ipId: asset.ipId,
        chainId: asset.chainId ?? undefined,
      }),
    [asset.chainId, asset.ipId],
  );

  return (
    <Card className="group overflow-hidden transition-shadow duration-200 ease-out hover:shadow-md motion-reduce:transition-none">
      <div className="relative aspect-video overflow-hidden border-b border-border bg-muted">
        {previewThumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewThumbnailUrl}
            alt={`${asset.title} thumbnail`}
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No thumbnail
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Preview ${asset.title}`}
            >
              <span className="rounded-full border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur-sm opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
                <Play className="size-5" />
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl overflow-hidden p-0">
            <div className="border-b border-border px-6 py-4">
              <DialogHeader>
                <DialogTitle className="text-lg">{asset.title}</DialogTitle>
                <DialogDescription className="max-w-prose">
                  {asset.summary}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="aspect-video bg-black">
              <video
                src={previewVideoUrl}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
              <Badge variant="outline" className="font-mono">
                IP: {formatShortHash(asset.ipId)}
              </Badge>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/ip/${encodeURIComponent(asset.ipId)}`}>
                    <Eye />
                    View details
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/projects?parentIp=${encodeURIComponent(asset.ipId)}`}
                  >
                    <Sparkles />
                    Remix
                  </Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0 truncate text-xl">
            {asset.title}
          </CardTitle>
          <Badge variant="outline" className="shrink-0 font-mono">
            {formatShortHash(asset.ipId)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-1">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <AlignLeft className="size-3.5" />
            Description
          </p>
          <p className="text-sm text-foreground/90">{asset.summary}</p>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Fingerprint className="size-3.5" />
              IP Asset ID
            </p>
            <div className="flex items-center gap-2">
              <code
                className="max-w-full truncate rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs"
                title={asset.ipId}
              >
                {asset.ipId}
              </code>
              <CopyIconButton value={asset.ipId} label="Copy IP Asset ID" />
              <ExternalLinkIconButton
                href={storyExplorerUrl}
                label="Open in Story Explorer"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Wallet className="size-3.5" />
              Creator wallet
            </p>
            <div className="flex items-center gap-2">
              <code
                className="max-w-full truncate rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs"
                title={asset.licensorWallet}
              >
                {asset.licensorWallet}
              </code>
              <CopyIconButton
                value={asset.licensorWallet}
                label="Copy creator wallet"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" />
              License terms
            </p>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
              {asset.terms}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link href={`/ip/${encodeURIComponent(asset.ipId)}`}>
            <Eye />
            View details
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/projects?parentIp=${encodeURIComponent(asset.ipId)}`}>
            <Sparkles />
            Remix
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
