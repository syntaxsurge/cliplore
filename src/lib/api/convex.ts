type ConvexError = {
  error: string;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "Convex request failed";
    try {
      const data = (await res.json()) as ConvexError;
      detail = data.error ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function fetchConvexUser(wallet: string) {
  const res = await fetch(
    `/api/convex/users?wallet=${encodeURIComponent(wallet)}`,
    {
      method: "GET",
    },
  );
  return handleResponse<{ user: any }>(res);
}

export async function upsertConvexUser(input: {
  wallet: string;
  displayName?: string;
  defaultLicensePreset?: string;
}) {
  const res = await fetch("/api/convex/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<{ user: any }>(res);
}

export async function fetchConvexStats(wallet: string) {
  const res = await fetch(
    `/api/convex/stats?wallet=${encodeURIComponent(wallet)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return handleResponse<{
    stats: { projects: number; assets: number; ipAssets: number };
  }>(res);
}

export async function fetchConvexProjects(wallet: string) {
  const res = await fetch(
    `/api/convex/projects?wallet=${encodeURIComponent(wallet)}`,
    { method: "GET", cache: "no-store" },
  );
  return handleResponse<{ projects: Array<any> }>(res);
}

export async function createConvexProject(input: {
  wallet: string;
  title: string;
  localId?: string;
}) {
  const res = await fetch("/api/convex/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<{ project: { id: string } }>(res);
}

export async function fetchConvexIpAssets(params?: {
  wallet?: string;
  assetKind?: string;
}) {
  const search = new URLSearchParams();
  if (params?.wallet) search.set("wallet", params.wallet);
  if (params?.assetKind) search.set("assetKind", params.assetKind);
  const suffix = search.toString();
  const url = suffix ? `/api/convex/ip-assets?${suffix}` : "/api/convex/ip-assets";
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });
  return handleResponse<{ ipAssets: Array<any> }>(res);
}

export async function fetchConvexIpAssetByIpId(ipId: string) {
  const res = await fetch(
    `/api/convex/ip-assets?ipId=${encodeURIComponent(ipId)}`,
    { method: "GET", cache: "no-store" },
  );
  return handleResponse<{ ipAsset: any | null }>(res);
}

export async function fetchConvexIpAssetsBySha256(sha256: string) {
  const res = await fetch(
    `/api/convex/ip-assets?sha256=${encodeURIComponent(sha256)}`,
    { method: "GET", cache: "no-store" },
  );
  return handleResponse<{ matches: Array<any> }>(res);
}

export async function createConvexIpAsset(input: {
  wallet: string;
  localProjectId?: string;
  projectTitle?: string;
  assetKind?: "video" | "dataset";
  datasetType?:
    | "pov-video"
    | "drone-footage"
    | "stereo-video"
    | "mocap"
    | "robotics-teleop"
    | "industrial-sensor"
    | "medical-imaging"
    | "mixed";
  tags?: string[];
  mediaMimeType?: string;
  mediaSizeBytes?: number;
  ipId: string;
  title: string;
  summary: string;
  terms: string;
  videoUrl: string;
  thumbnailUrl?: string;
  licenseTermsId?: string;
  txHash?: string;
  chainId?: number;
  ipMetadataUri?: string;
  ipMetadataHash?: string;
  nftMetadataUri?: string;
  nftMetadataHash?: string;
  videoKey?: string;
  thumbnailKey?: string;
  videoSha256?: string;
  thumbnailSha256?: string;
}) {
  const res = await fetch("/api/convex/ip-assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<{ ipAsset: { id: string } }>(res);
}

export async function fetchConvexEnforcementReports(params: {
  wallet?: string;
  targetIpId?: string;
}) {
  const url =
    params.wallet
      ? `/api/convex/enforcement-reports?wallet=${encodeURIComponent(params.wallet)}`
      : params.targetIpId
        ? `/api/convex/enforcement-reports?targetIpId=${encodeURIComponent(params.targetIpId)}`
        : "/api/convex/enforcement-reports";

  const res = await fetch(url, { method: "GET", cache: "no-store" });
  return handleResponse<{ reports: Array<any> }>(res);
}

export async function createConvexEnforcementReport(input: {
  wallet: string;
  targetIpId: string;
  protectedIpId?: string;
  targetTag: string;
  liveness: number;
  bond?: string;
  suspectUrl?: string;
  suspectSha256?: string;
  suspectFileName?: string;
  suspectFileType?: string;
  evidenceCid: string;
  evidenceUri: string;
  disputeId?: string;
  disputeTxHash?: string;
  chainId?: number;
}) {
  const res = await fetch("/api/convex/enforcement-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<{ report: { id: string } }>(res);
}
