export type DatasetMarketplaceAsset = {
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
  txHash: string | null;
  chainId: number | null;
  licensorWallet: string;
  createdAt: number;
  updatedAt: number;
};

