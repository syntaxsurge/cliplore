import Link from "next/link";
import { notFound } from "next/navigation";
import { getConvexClient } from "@/lib/db/convex/client";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { formatBytes, ipfsUriToGatewayUrl } from "@/lib/utils";
import { MintLicenseButton } from "@/app/(marketing)/ip/MintLicenseButton";
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

type Props = {
  params: Promise<{ ipId: string }>;
};

type DatasetAsset = {
  assetKind: string;
  datasetType: string | null;
  tags: string[] | null;
  mediaMimeType: string | null;
  mediaSizeBytes: number | null;
  ipId: string;
  title: string;
  summary: string;
  terms: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  licenseTermsId: string | null;
  ipMetadataUri: string | null;
  ipMetadataHash: string | null;
  nftMetadataUri: string | null;
  nftMetadataHash: string | null;
};

function getIpfsGatewayLink(uri: string) {
  return ipfsUriToGatewayUrl(uri);
}

export default async function DatasetDetailPage({ params }: Props) {
  const { ipId } = await params;

  let asset: DatasetAsset | null = null;
  try {
    const client = getConvexClient();
    asset = (await (client as any).query("functions/ipAssets:getByIpId", {
      ipId: ipId.toLowerCase(),
    })) as DatasetAsset | null;
  } catch {
    asset = null;
  }

  if (!asset || asset.assetKind !== "dataset") {
    return notFound();
  }

  const mediaUrl = ipfsUriToGatewayUrl(asset.videoUrl);
  const mime = asset.mediaMimeType ?? "";
  const hasVideo = mime.startsWith("video/");
  const hasAudio = mime.startsWith("audio/");
  const hasImage = mime.startsWith("image/");

  let ipMetadata: any | null = null;
  if (asset.ipMetadataUri) {
    try {
      const res = await fetch(getIpfsGatewayLink(asset.ipMetadataUri), {
        method: "GET",
        cache: "no-store",
      });
      if (res.ok) {
        ipMetadata = await res.json();
      }
    } catch {
      ipMetadata = null;
    }
  }

  const datasetMetadata =
    ipMetadata && typeof ipMetadata === "object" ? (ipMetadata as any).dataset : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="max-w-full break-all">
            IP Asset ID: {asset.ipId}
          </Badge>
          {asset.datasetType ? <Badge variant="default">{asset.datasetType}</Badge> : null}
          {mime ? <Badge variant="outline">{mime}</Badge> : null}
          {typeof asset.mediaSizeBytes === "number" ? (
            <Badge variant="outline">{formatBytes(asset.mediaSizeBytes)}</Badge>
          ) : null}
        </div>

        <h1 className="text-4xl font-semibold text-foreground">{asset.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{asset.summary}</p>

        {asset.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {asset.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-black">
          {hasVideo ? (
            <video src={mediaUrl} controls className="h-full w-full" />
          ) : hasAudio ? (
            <div className="p-6">
              <audio src={mediaUrl} controls className="w-full" />
            </div>
          ) : hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt={asset.title} className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-start gap-3 p-6">
              <p className="text-sm text-muted-foreground">
                This sample is not previewable in-browser. Download the file to inspect it locally.
              </p>
              <Button asChild>
                <a href={mediaUrl} target="_blank" rel="noreferrer">
                  Download dataset sample
                </a>
              </Button>
            </div>
          )}
        </div>

        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Primary file</p>
              <p className="text-xs text-muted-foreground break-all">{asset.videoUrl}</p>
            </div>
            <Button asChild variant="outline">
              <a href={mediaUrl} target="_blank" rel="noreferrer">
                Open file
              </a>
            </Button>
          </div>

          {asset.thumbnailUrl ? (
            <div className="flex items-center gap-3">
              <div className="h-20 w-36 overflow-hidden rounded-lg border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.thumbnailUrl}
                  alt="Cover"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Cover image</p>
                <p className="text-xs text-muted-foreground">Used for marketplace previews.</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>License terms</CardTitle>
            <CardDescription>Mint a Story license token to use this dataset under PIL terms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-foreground/90">{asset.terms}</p>
            <p className="text-sm text-muted-foreground">
              The license terms are attached on-chain. The IP metadata URI + SHA-256 hashes
              provide a verifiable, rights-cleared reference for downstream AI workflows.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mint license</CardTitle>
            <CardDescription>Mint a license token on Story testnet.</CardDescription>
          </CardHeader>
          <CardContent>
            {asset.licenseTermsId ? (
              <MintLicenseButton licensorIpId={asset.ipId} licenseTermsId={asset.licenseTermsId} />
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                License terms weren’t stored for this IP Asset. Re-register the asset from Cliplore
                to enable minting.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>References</CardTitle>
          <CardDescription>Explorer and metadata pointers for verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <a
                href={getStoryIpaExplorerUrl({ ipId: asset.ipId })}
                target="_blank"
                rel="noreferrer"
              >
                Open in Story Explorer
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/datasets">Back to datasets</Link>
            </Button>
          </div>

          {asset.ipMetadataUri ? (
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">IP metadata</p>
              <p className="mt-1 text-xs text-muted-foreground break-all">{asset.ipMetadataUri}</p>
              {asset.ipMetadataHash ? (
                <p className="mt-1 text-xs text-muted-foreground break-all">
                  SHA-256: {asset.ipMetadataHash}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <a href={getIpfsGatewayLink(asset.ipMetadataUri)} target="_blank" rel="noreferrer">
                    View JSON
                  </a>
                </Button>
              </div>
            </div>
          ) : null}

          {datasetMetadata ? (
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">Dataset metadata</p>
              <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
                {JSON.stringify(datasetMetadata, null, 2)}
              </pre>
            </div>
          ) : null}

          {asset.nftMetadataUri ? (
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">NFT metadata</p>
              <p className="mt-1 text-xs text-muted-foreground break-all">{asset.nftMetadataUri}</p>
              {asset.nftMetadataHash ? (
                <p className="mt-1 text-xs text-muted-foreground break-all">
                  SHA-256: {asset.nftMetadataHash}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <a href={getIpfsGatewayLink(asset.nftMetadataUri)} target="_blank" rel="noreferrer">
                    View JSON
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          IP metadata and hashes are the canonical references used by Story Protocol to represent this
          dataset sample.
        </CardFooter>
      </Card>
    </div>
  );
}
