import { notFound } from "next/navigation";
import { MintLicenseButton } from "../MintLicenseButton";
import { getConvexClient } from "@/lib/db/convex/client";
import { Badge } from "@/components/ui/badge";
import { ipfsUriToGatewayUrl } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  params: Promise<{ ipId: string }>;
};

export default async function IpDetailPage({ params }: Props) {
  const { ipId } = await params;

  let asset: any | null = null;
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">IP Asset ID: {asset.ipId}</Badge>
        </div>
        <h1 className="text-4xl font-semibold text-foreground">
          {asset.title}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{asset.summary}</p>
      </div>

      <Card className="overflow-hidden">
        <video
          src={ipfsUriToGatewayUrl(asset.videoUrl)}
          controls
          className="h-full w-full"
        />
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>License terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-foreground/90">{asset.terms}</p>
            <p className="text-sm text-muted-foreground">
              Licensing happens on‑chain via Story Protocol. Minting a license
              gives you the right to remix this video and register derivatives
              while honoring the revenue share encoded in the license terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mint & remix</CardTitle>
            <CardDescription>
              Connect your wallet to mint a license token on Story testnet, then
              start a remix project in Cliplore.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {asset.licenseTermsId ? (
              <MintLicenseButton
                licensorIpId={asset.ipId}
                licenseTermsId={asset.licenseTermsId}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                License terms weren’t stored for this IP Asset. Re‑register the
                asset from Cliplore to enable minting.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
