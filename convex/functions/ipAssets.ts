import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { v } from "convex/values";
import { getUserByWallet } from "./_helpers";

function getRecordUpdatedAt(record: any) {
  return record.updatedAt ?? record.createdAt ?? 0;
}

function toIpAssetResponse(record: any) {
  return {
    assetKind: record.assetKind ?? "video",
    datasetType: record.datasetType ?? null,
    tags: record.tags ?? [],
    mediaMimeType: record.mediaMimeType ?? null,
    mediaSizeBytes: record.mediaSizeBytes ?? null,
    archived: Boolean(record.archived),
    archivedAt: record.archivedAt ?? null,
    archivedBy: record.archivedBy ?? null,
    ipId: record.ipId,
    title: record.title,
    summary: record.summary,
    terms: record.terms,
    videoUrl: record.videoUrl,
    thumbnailUrl: record.thumbnailUrl ?? null,
    videoSha256: record.videoSha256 ?? null,
    thumbnailSha256: record.thumbnailSha256 ?? null,
    licenseTermsId: record.licenseTermsId ?? null,
    txHash: record.txHash ?? null,
    chainId: record.chainId ?? null,
    ipMetadataUri: record.ipMetadataUri ?? null,
    ipMetadataHash: record.ipMetadataHash ?? null,
    nftMetadataUri: record.nftMetadataUri ?? null,
    nftMetadataHash: record.nftMetadataHash ?? null,
    videoKey: record.videoKey ?? null,
    thumbnailKey: record.thumbnailKey ?? null,
    licensorWallet: record.licensorWallet,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt ?? record.createdAt,
  };
}

export const upsert = mutation({
  args: {
    wallet: v.string(),
    localProjectId: v.optional(v.string()),
    projectTitle: v.optional(v.string()),
    assetKind: v.optional(v.string()),
    datasetType: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    mediaMimeType: v.optional(v.string()),
    mediaSizeBytes: v.optional(v.number()),
    ipId: v.string(),
    title: v.string(),
    summary: v.string(),
    terms: v.string(),
    videoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    videoSha256: v.optional(v.string()),
    thumbnailSha256: v.optional(v.string()),
    licenseTermsId: v.optional(v.string()),
    txHash: v.optional(v.string()),
    chainId: v.optional(v.number()),
    ipMetadataUri: v.optional(v.string()),
    ipMetadataHash: v.optional(v.string()),
    nftMetadataUri: v.optional(v.string()),
    nftMetadataHash: v.optional(v.string()),
    videoKey: v.optional(v.string()),
    thumbnailKey: v.optional(v.string()),
  },
  handler: async (
    { db }: MutationCtx,
    {
      wallet,
      localProjectId,
      projectTitle,
      assetKind,
      datasetType,
      tags,
      mediaMimeType,
      mediaSizeBytes,
      ipId,
      title,
      summary,
      terms,
      videoUrl,
      thumbnailUrl,
      videoSha256,
      thumbnailSha256,
      licenseTermsId,
      txHash,
      chainId,
      ipMetadataUri,
      ipMetadataHash,
      nftMetadataUri,
      nftMetadataHash,
      videoKey,
      thumbnailKey,
    }: {
      wallet: string;
      localProjectId?: string;
      projectTitle?: string;
      assetKind?: string;
      datasetType?: string;
      tags?: string[];
      mediaMimeType?: string;
      mediaSizeBytes?: number;
      ipId: string;
      title: string;
      summary: string;
      terms: string;
      videoUrl: string;
      thumbnailUrl?: string;
      videoSha256?: string;
      thumbnailSha256?: string;
      licenseTermsId?: string;
      txHash?: string;
      chainId?: number;
      ipMetadataUri?: string;
      ipMetadataHash?: string;
      nftMetadataUri?: string;
      nftMetadataHash?: string;
      videoKey?: string;
      thumbnailKey?: string;
    },
  ) => {
    const user = await getUserByWallet(db, wallet);
    if (!user) {
      throw new Error("User must exist before registering IP.");
    }

    const now = Date.now();
    const normalizedIpId = ipId.toLowerCase();
    const normalizedAssetKind = assetKind?.trim().toLowerCase() || "video";
    const normalizedDatasetType = datasetType?.trim().toLowerCase();
    const normalizedTags = tags
      ? tags
          .map((tag) => tag.trim())
          .filter((tag) => Boolean(tag))
          .slice(0, 32)
      : undefined;
    const normalizedVideoSha256 = videoSha256?.toLowerCase();
    const normalizedThumbnailSha256 = thumbnailSha256?.toLowerCase();

    const existingMatches = await db
      .query("ipAssets")
      .withIndex("by_ipId", (q: any) => q.eq("ipId", normalizedIpId))
      .collect();

    const sortedExisting = [...existingMatches].sort(
      (a: any, b: any) => getRecordUpdatedAt(b) - getRecordUpdatedAt(a),
    );
    const existing =
      sortedExisting.find((record: any) => !record.archived) ??
      sortedExisting[0] ??
      null;

    if (existing) {
      if (
        existing.licensorWallet?.toLowerCase?.() !== wallet.toLowerCase() &&
        existing.licensorWallet !== wallet
      ) {
        throw new Error("Only the IP asset owner can update this listing.");
      }

      const patch: any = {
        title,
        summary,
        terms,
        videoUrl,
        licensorWallet: wallet,
        updatedAt: now,
      };

      patch.assetKind = normalizedAssetKind;
      if (normalizedDatasetType !== undefined) {
        patch.datasetType = normalizedDatasetType;
      }
      if (normalizedTags !== undefined) patch.tags = normalizedTags;
      if (mediaMimeType !== undefined) patch.mediaMimeType = mediaMimeType;
      if (mediaSizeBytes !== undefined) patch.mediaSizeBytes = mediaSizeBytes;

      if (thumbnailUrl !== undefined) patch.thumbnailUrl = thumbnailUrl;
      if (normalizedVideoSha256 !== undefined) {
        patch.videoSha256 = normalizedVideoSha256;
      }
      if (normalizedThumbnailSha256 !== undefined) {
        patch.thumbnailSha256 = normalizedThumbnailSha256;
      }
      if (licenseTermsId !== undefined) patch.licenseTermsId = licenseTermsId;
      if (txHash !== undefined) patch.txHash = txHash;
      if (chainId !== undefined) patch.chainId = chainId;
      if (ipMetadataUri !== undefined) patch.ipMetadataUri = ipMetadataUri;
      if (ipMetadataHash !== undefined) patch.ipMetadataHash = ipMetadataHash;
      if (nftMetadataUri !== undefined) patch.nftMetadataUri = nftMetadataUri;
      if (nftMetadataHash !== undefined) patch.nftMetadataHash = nftMetadataHash;
      if (videoKey !== undefined) patch.videoKey = videoKey;
      if (thumbnailKey !== undefined) patch.thumbnailKey = thumbnailKey;

      await db.patch(existing._id, patch);

      return { id: existing._id };
    }

    let projectId: any | undefined;
    if (normalizedAssetKind !== "dataset") {
      if (!localProjectId) {
        throw new Error(
          "localProjectId is required when registering a new project IP asset.",
        );
      }

      let project = await db
        .query("projects")
        .withIndex("by_owner_localId", (q: any) =>
          q.eq("owner", user._id).eq("localId", localProjectId),
        )
        .unique();

      if (!project) {
        const insertedProjectId = await db.insert("projects", {
          owner: user._id,
          localId: localProjectId,
          title: projectTitle ?? title,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        });
        project = await db.get(insertedProjectId);
      }

      if (!project) {
        throw new Error("Project not found for this wallet.");
      }
      projectId = project._id;
    }

    const insert: any = {
      ipId: normalizedIpId,
      title,
      summary,
      terms,
      videoUrl,
      licensorWallet: wallet,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    if (projectId) insert.projectId = projectId;
    insert.assetKind = normalizedAssetKind;
    if (normalizedDatasetType !== undefined) insert.datasetType = normalizedDatasetType;
    if (normalizedTags !== undefined) insert.tags = normalizedTags;
    if (mediaMimeType !== undefined) insert.mediaMimeType = mediaMimeType;
    if (mediaSizeBytes !== undefined) insert.mediaSizeBytes = mediaSizeBytes;

    if (thumbnailUrl !== undefined) insert.thumbnailUrl = thumbnailUrl;
    if (normalizedVideoSha256 !== undefined) {
      insert.videoSha256 = normalizedVideoSha256;
    }
    if (normalizedThumbnailSha256 !== undefined) {
      insert.thumbnailSha256 = normalizedThumbnailSha256;
    }
    if (licenseTermsId !== undefined) insert.licenseTermsId = licenseTermsId;
    if (txHash !== undefined) insert.txHash = txHash;
    if (chainId !== undefined) insert.chainId = chainId;
    if (ipMetadataUri !== undefined) insert.ipMetadataUri = ipMetadataUri;
    if (ipMetadataHash !== undefined) insert.ipMetadataHash = ipMetadataHash;
    if (nftMetadataUri !== undefined) insert.nftMetadataUri = nftMetadataUri;
    if (nftMetadataHash !== undefined) insert.nftMetadataHash = nftMetadataHash;
    if (videoKey !== undefined) insert.videoKey = videoKey;
    if (thumbnailKey !== undefined) insert.thumbnailKey = thumbnailKey;

    const recordId = await db.insert("ipAssets", insert);

    return { id: recordId };
  },
});

export const listMarketplace = query({
  args: {},
  handler: async ({ db }: QueryCtx) => {
    const records = await db.query("ipAssets").order("desc").collect();
    const seen = new Set<string>();
    const deduped = records.filter((record: any) => {
      if (record.archived) return false;
      const key = (record.ipId ?? "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.map(toIpAssetResponse);
  },
});

export const listByAssetKind = query({
  args: { assetKind: v.string() },
  handler: async ({ db }: QueryCtx, { assetKind }: { assetKind: string }) => {
    const normalized = assetKind.trim().toLowerCase();
    const records = await db
      .query("ipAssets")
      .withIndex("by_assetKind", (q: any) => q.eq("assetKind", normalized))
      .order("desc")
      .collect();
    const seen = new Set<string>();
    const deduped = records.filter((record: any) => {
      if (record.archived) return false;
      const key = (record.ipId ?? "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.map(toIpAssetResponse);
  },
});

export const listByWallet = query({
  args: { wallet: v.string(), includeArchived: v.optional(v.boolean()) },
  handler: async (
    { db }: QueryCtx,
    {
      wallet,
      includeArchived,
    }: { wallet: string; includeArchived?: boolean },
  ) => {
    const records = await db
      .query("ipAssets")
      .withIndex("by_licensorWallet", (q: any) =>
        q.eq("licensorWallet", wallet),
      )
      .collect();

    const filtered = includeArchived ? records : records.filter((r: any) => !r.archived);

    const sorted = filtered.sort(
      (a: any, b: any) => getRecordUpdatedAt(b) - getRecordUpdatedAt(a),
    );

    const seen = new Set<string>();
    const deduped = sorted.filter((record: any) => {
      const key = (record.ipId ?? "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.map(toIpAssetResponse);
  },
});

export const getByIpId = query({
  args: { ipId: v.string() },
  handler: async ({ db }: QueryCtx, { ipId }: { ipId: string }) => {
    const normalizedIpId = ipId.toLowerCase();
    const matches = await db
      .query("ipAssets")
      .withIndex("by_ipId", (q: any) => q.eq("ipId", normalizedIpId))
      .collect();

    if (!matches.length) return null;

    const sorted = [...matches].sort(
      (a: any, b: any) => getRecordUpdatedAt(b) - getRecordUpdatedAt(a),
    );
    return toIpAssetResponse(sorted[0]);
  },
});

export const setArchived = mutation({
  args: { wallet: v.string(), ipId: v.string(), archived: v.boolean() },
  handler: async (
    { db }: MutationCtx,
    { wallet, ipId, archived }: { wallet: string; ipId: string; archived: boolean },
  ) => {
    const user = await getUserByWallet(db, wallet);
    if (!user) {
      throw new Error("User must exist before updating an IP asset.");
    }

    const normalizedIpId = ipId.toLowerCase();
    const matches = await db
      .query("ipAssets")
      .withIndex("by_ipId", (q: any) => q.eq("ipId", normalizedIpId))
      .collect();

    if (!matches.length) {
      throw new Error("IP asset not found.");
    }

    const normalizedWallet = wallet.toLowerCase();
    for (const record of matches) {
      const owner = (record.licensorWallet ?? "").toLowerCase();
      if (owner && owner !== normalizedWallet) {
        throw new Error("Only the IP asset owner can change archive status.");
      }
    }

    const now = Date.now();
    for (const record of matches) {
      await db.patch(record._id, {
        archived,
        archivedAt: archived ? now : undefined,
        archivedBy: archived ? wallet : undefined,
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});

export const findBySha256 = query({
  args: { sha256: v.string() },
  handler: async ({ db }: QueryCtx, { sha256 }: { sha256: string }) => {
    const normalized = sha256.toLowerCase();
    const matches: Array<{ matchOn: "video" | "thumbnail" } & Record<string, unknown>> =
      [];
    const seenIpIds = new Set<string>();

    const videoMatches = await db
      .query("ipAssets")
      .withIndex("by_videoSha256", (q: any) => q.eq("videoSha256", normalized))
      .collect();

    for (const record of videoMatches) {
      if (seenIpIds.has(record.ipId)) continue;
      seenIpIds.add(record.ipId);
      matches.push({ matchOn: "video", ...toIpAssetResponse(record) });
    }

    const thumbnailMatches = await db
      .query("ipAssets")
      .withIndex("by_thumbnailSha256", (q: any) =>
        q.eq("thumbnailSha256", normalized),
      )
      .collect();

    for (const record of thumbnailMatches) {
      if (seenIpIds.has(record.ipId)) continue;
      seenIpIds.add(record.ipId);
      matches.push({ matchOn: "thumbnail", ...toIpAssetResponse(record) });
    }

    return matches;
  },
});
