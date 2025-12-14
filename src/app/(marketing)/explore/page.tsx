import { getConvexClient } from "@/lib/db/convex/client";
import ExploreClient from "./ExploreClient";
import type { ExploreAsset } from "./types";

export default async function ExplorePage() {
  let ipAssets: ExploreAsset[] = [];
  let hadError = false;
  try {
    const client = getConvexClient();
    ipAssets = await (client as any).query(
      "functions/ipAssets:listMarketplace",
      {},
    );
  } catch {
    hadError = true;
  }

  ipAssets = (ipAssets ?? []).filter((asset) => asset?.assetKind !== "dataset");

  return <ExploreClient initialAssets={ipAssets} hadError={hadError} />;
}
