import Link from "next/link";
import { getConvexClient } from "@/lib/db/convex/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ipfsUriToGatewayUrl } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ExplorePage() {
  let ipAssets: Array<any> = [];
  try {
    const client = getConvexClient();
    ipAssets = await (client as any).query(
      "functions/ipAssets:listMarketplace",
      {},
    );
  } catch {
    ipAssets = [];
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Marketplace</p>
        <h1 className="text-4xl font-semibold text-foreground">Explore IP</h1>
        <p className="text-muted-foreground">
          Watch, verify, and license Cliplore‑created IP assets. Each card shows
          the on‑chain IP ID and attached terms so remixing stays safe by
          design.
        </p>
      </div>

      {ipAssets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No IP assets yet</CardTitle>
            <CardDescription>
              Registered IP from Cliplore projects appears here once minted on
              Story Protocol.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/projects">Create a project</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ipAssets.map((ip) => (
            <Card key={ip.ipId} className="overflow-hidden">
              <div className="aspect-video overflow-hidden border-b border-border">
                <video
                  src={ipfsUriToGatewayUrl(ip.videoUrl)}
                  controls
                  className="h-full w-full object-cover"
                />
              </div>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="truncate text-xl">{ip.title}</CardTitle>
                  <Badge variant="outline">{ip.ipId}</Badge>
                </div>
                <CardDescription>{ip.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                  {ip.terms}
                </p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/ip/${ip.ipId}`}>View details</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/projects?parentIp=${encodeURIComponent(ip.ipId)}`}
                  >
                    Remix this IP
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
