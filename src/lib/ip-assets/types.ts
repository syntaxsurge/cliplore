import type { ProjectPublishRecord } from "@/app/types";

export type LocalPublishedAsset = {
  ipId: string;
  projectId: string;
  projectName: string;
  exportId: string;
  exportName: string;
  publish: ProjectPublishRecord;
};

export type MarketplaceAsset = {
  assetKind?: string;
  datasetType?: string | null;
  tags?: string[] | null;
  mediaMimeType?: string | null;
  mediaSizeBytes?: number | null;
  archived: boolean;
  archivedAt: number | null;
  archivedBy: string | null;
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
  createdAt: number;
  updatedAt: number;
};

export type AssetRow = {
  asset: MarketplaceAsset;
  hasLocal: boolean;
  hasRemote: boolean;
  local?: LocalPublishedAsset;
};

