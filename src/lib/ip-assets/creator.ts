import type { ProjectState } from "@/app/types";
import type { AssetRow, LocalPublishedAsset, MarketplaceAsset } from "./types";

function normalizeIpId(value: string) {
  return value.trim().toLowerCase();
}

function parseTimestamp(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAssetSortTime(asset: MarketplaceAsset) {
  const candidate = asset.updatedAt ?? asset.createdAt;
  return Number.isFinite(candidate) ? candidate : 0;
}

export function collectLocalPublishedAssets(projects: ProjectState[]) {
  const bestByIpId = new Map<string, { asset: LocalPublishedAsset; time: number }>();

  for (const project of projects ?? []) {
    for (const exportRecord of project.exports ?? []) {
      const publish = exportRecord.publish;
      if (!publish?.ipId) continue;

      const ipId = normalizeIpId(publish.ipId);
      if (!ipId) continue;

      const createdAtMs = parseTimestamp(publish.createdAt);
      const candidate: LocalPublishedAsset = {
        ipId,
        projectId: project.id,
        projectName: project.projectName,
        exportId: exportRecord.id,
        exportName: exportRecord.name,
        publish: { ...publish, ipId },
      };

      const existing = bestByIpId.get(ipId);
      if (!existing || createdAtMs >= existing.time) {
        bestByIpId.set(ipId, { asset: candidate, time: createdAtMs });
      }
    }
  }

  return Array.from(bestByIpId.values())
    .sort((a, b) => b.time - a.time)
    .map((value) => value.asset);
}

export function toMarketplaceAssetFromLocal(
  local: LocalPublishedAsset,
  opts: { wallet: string; chainId: number },
): MarketplaceAsset {
  const createdAtMs = parseTimestamp(local.publish.createdAt);

  return {
    ipId: normalizeIpId(local.ipId),
    archived: false,
    archivedAt: null,
    archivedBy: null,
    assetKind: "video",
    datasetType: null,
    tags: [],
    mediaMimeType: null,
    mediaSizeBytes: null,
    title: local.publish.title,
    summary: local.publish.summary,
    terms: local.publish.terms,
    videoUrl: local.publish.videoUrl,
    thumbnailUrl: local.publish.thumbnailUrl ?? null,
    licenseTermsId: local.publish.licenseTermsId ?? null,
    txHash: local.publish.txHash ?? null,
    chainId: opts.chainId,
    licensorWallet: opts.wallet,
    createdAt: createdAtMs,
    updatedAt: createdAtMs,
  };
}

export function mergeCreatorAssetRows(opts: {
  localPublished: LocalPublishedAsset[];
  remoteAssets: MarketplaceAsset[];
  wallet: string;
  chainId: number;
}): AssetRow[] {
  const rows = new Map<string, AssetRow>();

  for (const asset of opts.remoteAssets ?? []) {
    const ipId = normalizeIpId(asset.ipId);
    if (!ipId) continue;

    rows.set(ipId, {
      asset: { ...asset, ipId },
      hasLocal: false,
      hasRemote: true,
    });
  }

  for (const local of opts.localPublished ?? []) {
    const ipId = normalizeIpId(local.ipId);
    if (!ipId) continue;

    const existing = rows.get(ipId);
    if (existing) {
      rows.set(ipId, { ...existing, hasLocal: true, local });
      continue;
    }

    rows.set(ipId, {
      asset: toMarketplaceAssetFromLocal(local, {
        wallet: opts.wallet,
        chainId: opts.chainId,
      }),
      hasLocal: true,
      hasRemote: false,
      local,
    });
  }

  return Array.from(rows.values()).sort(
    (a, b) => getAssetSortTime(b.asset) - getAssetSortTime(a.asset),
  );
}

