import { getConvexClient } from "@/lib/db/convex/client";
import DatasetsClient from "./DatasetsClient";
import type { DatasetMarketplaceAsset } from "./types";

export const dynamic = "force-dynamic";

export default async function DatasetsPage() {
  let datasets: DatasetMarketplaceAsset[] = [];
  let hadError = false;

  try {
    const client = getConvexClient();
    datasets = (await (client as any).query("functions/ipAssets:listByAssetKind", {
      assetKind: "dataset",
    })) as DatasetMarketplaceAsset[];
  } catch {
    hadError = true;
  }

  const normalized = (datasets ?? []).filter(
    (asset) => asset?.assetKind?.toLowerCase() === "dataset",
  );

  return <DatasetsClient initialDatasets={normalized} hadError={hadError} />;
}

