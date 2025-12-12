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

export async function fetchConvexIpAssets() {
  const res = await fetch("/api/convex/ip-assets", {
    method: "GET",
    cache: "no-store",
  });
  return handleResponse<{ ipAssets: Array<any> }>(res);
}

export async function createConvexIpAsset(input: {
  wallet: string;
  localProjectId: string;
  ipId: string;
  title: string;
  summary: string;
  terms: string;
  videoUrl: string;
  thumbnailUrl?: string;
  licenseTermsId?: string;
  txHash?: string;
}) {
  const res = await fetch("/api/convex/ip-assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<{ ipAsset: { id: string } }>(res);
}
