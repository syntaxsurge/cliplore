import Link from "next/link";
import { getConvexClient } from "@/lib/db/convex/client";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { formatBytes } from "@/lib/utils";
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
  createdAt: number;
  updatedAt: number;
};

export default async function DatasetsPage() {
  let datasets: DatasetAsset[] = [];
  try {
    const client = getConvexClient();
    datasets = (await (client as any).query("functions/ipAssets:listByAssetKind", {
      assetKind: "dataset",
    })) as DatasetAsset[];
  } catch {
    datasets = [];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Data track</p>
          <h1 className="text-4xl font-semibold text-foreground">Datasets</h1>
          <p className="max-w-3xl text-muted-foreground">
            Rights-cleared real-world samples (PoV, drone, mocap, robotics, medical, and more)
            registered as Story IP Assets with explicit licensing terms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/datasets/new">Publish a dataset</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explore">Explore videos</Link>
          </Button>
        </div>
      </div>

      {datasets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No datasets yet</CardTitle>
            <CardDescription>
              Publish your first data sample to register it on Story and list it here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/datasets/new">Publish a dataset</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/projects">Open studio</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset) => (
            <Card key={dataset.ipId} className="overflow-hidden">
              <div className="aspect-video overflow-hidden border-b border-border bg-muted">
                {dataset.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dataset.thumbnailUrl}
                    alt={`${dataset.title} cover`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    No cover image
                  </div>
                )}
              </div>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="truncate text-xl">{dataset.title}</CardTitle>
                  <Badge variant="outline" className="font-mono">
                    {dataset.ipId.slice(0, 6)}…{dataset.ipId.slice(-4)}
                  </Badge>
                </div>
                <CardDescription>{dataset.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {dataset.datasetType ? (
                    <Badge variant="default">{dataset.datasetType}</Badge>
                  ) : null}
                  {dataset.mediaMimeType ? (
                    <Badge variant="outline">{dataset.mediaMimeType}</Badge>
                  ) : null}
                  {typeof dataset.mediaSizeBytes === "number" ? (
                    <Badge variant="outline">{formatBytes(dataset.mediaSizeBytes)}</Badge>
                  ) : null}
                </div>

                {dataset.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {dataset.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                  {dataset.terms}
                </p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/datasets/${encodeURIComponent(dataset.ipId)}`}>View</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={getStoryIpaExplorerUrl({ ipId: dataset.ipId })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Story Explorer
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
