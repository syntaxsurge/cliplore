import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getConvexClient } from "@/lib/db/convex/client";
import {
  getStoryIpaExplorerUrl,
  getStoryTxExplorerUrl,
} from "@/lib/story/explorer";
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
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import { ExternalLinkIconButton } from "@/components/data-display/ExternalLinkIconButton";
import { OwnerDashboardCallout } from "@/components/data-display/OwnerDashboardCallout";
import { TruncatedCode } from "@/components/data-display/TruncatedCode";
import { formatShortHash, ipfsUriToGatewayUrl } from "@/lib/utils";
import {
  ArrowLeft,
  FileText,
  Fingerprint,
  Hash,
  Sparkles,
  Wallet,
} from "lucide-react";
import { MintLicenseButton } from "../MintLicenseButton";

type Props = {
  params: Promise<{ ipId: string }>;
};

type IpAsset = {
  assetKind: string;
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
};

export default async function IpDetailPage({ params }: Props) {
  const { ipId } = await params;

  let asset: IpAsset | null = null;
  try {
    const client = getConvexClient();
    asset = await (client as any).query("functions/ipAssets:getByIpId", {
      ipId: ipId.toLowerCase(),
    });
  } catch {
    asset = null;
  }

  if (!asset) {
    return notFound();
  }

  if (asset.assetKind === "dataset") {
    redirect(`/datasets/${encodeURIComponent(asset.ipId)}`);
  }

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
  const remixHref = `/projects?parentIp=${encodeURIComponent(asset.ipId)}`;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/explore">
              <ArrowLeft />
              Back to Explore
            </Link>
          </Button>

          <p className="text-sm text-muted-foreground">IP Asset</p>

          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              {asset.title}
            </h1>
            <Badge variant="outline" className="font-mono">
              IP: {formatShortHash(asset.ipId)}
            </Badge>
            <Badge variant={asset.licenseTermsId ? "success" : "warning"}>
              {asset.licenseTermsId ? "Mintable" : "Terms missing"}
            </Badge>
          </div>

          <p className="max-w-3xl text-muted-foreground">{asset.summary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href={remixHref}>
              <Sparkles />
              Remix
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={storyIpaUrl} target="_blank" rel="noreferrer noopener">
              Open in Explorer
            </a>
          </Button>
        </div>
      </div>

      <OwnerDashboardCallout
        ipId={asset.ipId}
        licensorWallet={asset.licensorWallet}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 overflow-hidden">
          <div className="aspect-video border-b border-border bg-black">
            <video
              src={ipfsUriToGatewayUrl(asset.videoUrl)}
              poster={
                asset.thumbnailUrl
                  ? ipfsUriToGatewayUrl(asset.thumbnailUrl)
                  : undefined
              }
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            />
          </div>
          <CardContent className="pt-6">
            <div className="grid gap-1">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileText className="size-3.5" />
                License terms
              </p>
              <p className="text-sm text-foreground/90">{asset.terms}</p>
              <p className="text-sm text-muted-foreground">
                Minting a Story Protocol license token grants remix rights and
                encodes the revenue share onchain.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Mint & remix</CardTitle>
              <CardDescription>
                Mint a license token on Story Protocol, then start a remix
                project in Cliplore.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {asset.licenseTermsId ? (
                <MintLicenseButton
                  licensorIpId={asset.ipId}
                  licenseTermsId={asset.licenseTermsId}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  License terms weren’t stored for this IP Asset. Re-register
                  the asset from Cliplore to enable minting.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href={remixHref}>
                  <Sparkles />
                  Start remix project
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Onchain details</CardTitle>
              <CardDescription>
                Copy identifiers or open them in the explorer.
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
        </div>
      </div>
    </div>
  );
}
