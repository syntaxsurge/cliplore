import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { v } from "convex/values";

async function getUserByWallet(
  db: QueryCtx["db"] | MutationCtx["db"],
  wallet: string,
) {
  return db
    .query("users")
    .withIndex("by_wallet", (q: any) => q.eq("wallet", wallet))
    .unique();
}

export const create = mutation({
  args: {
    wallet: v.string(),
    localProjectId: v.optional(v.string()),
    projectTitle: v.optional(v.string()),
    ipId: v.string(),
    title: v.string(),
    summary: v.string(),
    terms: v.string(),
    videoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
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
      ipId,
      title,
      summary,
      terms,
      videoUrl,
      thumbnailUrl,
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
    },
  ) => {
    const user = await getUserByWallet(db, wallet);
    if (!user) {
      throw new Error("User must exist before registering IP.");
    }

    const now = Date.now();
    const normalizedIpId = ipId.toLowerCase();

    const existing = await db
      .query("ipAssets")
      .withIndex("by_ipId", (q: any) => q.eq("ipId", normalizedIpId))
      .unique();

    if (existing) {
      await db.patch(existing._id, {
        title,
        summary,
        terms,
        videoUrl,
        thumbnailUrl,
        licensorWallet: wallet,
        licenseTermsId,
        txHash,
        chainId,
        ipMetadataUri,
        ipMetadataHash,
        nftMetadataUri,
        nftMetadataHash,
        videoKey,
        thumbnailKey,
        updatedAt: now,
      });

      return { id: existing._id };
    }

    if (!localProjectId) {
      throw new Error(
        "localProjectId is required when registering a new IP asset.",
      );
    }

    let project = await db
      .query("projects")
      .withIndex("by_owner_localId", (q: any) =>
        q.eq("owner", user._id).eq("localId", localProjectId),
      )
      .unique();

    if (!project) {
      const projectId = await db.insert("projects", {
        owner: user._id,
        localId: localProjectId,
        title: projectTitle ?? title,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
      project = await db.get(projectId);
    }

    if (!project) {
      throw new Error("Project not found for this wallet.");
    }

    const recordId = await db.insert("ipAssets", {
      projectId: project._id,
      ipId: normalizedIpId,
      title,
      summary,
      terms,
      videoUrl,
      thumbnailUrl,
      licensorWallet: wallet,
      licenseTermsId,
      txHash,
      chainId,
      ipMetadataUri,
      ipMetadataHash,
      nftMetadataUri,
      nftMetadataHash,
      videoKey,
      thumbnailKey,
      createdAt: now,
      updatedAt: now,
    });

    return { id: recordId };
  },
});

export const listMarketplace = query({
  args: {},
  handler: async ({ db }: QueryCtx) => {
    const records = await db.query("ipAssets").order("desc").collect();
    return records.map((record: any) => ({
      ipId: record.ipId,
      title: record.title,
      summary: record.summary,
      terms: record.terms,
      videoUrl: record.videoUrl,
      thumbnailUrl: record.thumbnailUrl ?? null,
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
    }));
  },
});

export const listByWallet = query({
  args: { wallet: v.string() },
  handler: async ({ db }: QueryCtx, { wallet }: { wallet: string }) => {
    const records = await db
      .query("ipAssets")
      .withIndex("by_licensorWallet", (q: any) =>
        q.eq("licensorWallet", wallet),
      )
      .collect();

    return records
      .sort(
        (a: any, b: any) =>
          (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
      )
      .map((record: any) => ({
        ipId: record.ipId,
        title: record.title,
        summary: record.summary,
        terms: record.terms,
        videoUrl: record.videoUrl,
        thumbnailUrl: record.thumbnailUrl ?? null,
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
      }));
  },
});

export const getByIpId = query({
  args: { ipId: v.string() },
  handler: async ({ db }: QueryCtx, { ipId }: { ipId: string }) => {
    const normalizedIpId = ipId.toLowerCase();
    const record = await db
      .query("ipAssets")
      .withIndex("by_ipId", (q: any) => q.eq("ipId", normalizedIpId))
      .unique();

    if (!record) return null;

    return {
      ipId: record.ipId,
      title: record.title,
      summary: record.summary,
      terms: record.terms,
      videoUrl: record.videoUrl,
      thumbnailUrl: record.thumbnailUrl ?? null,
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
  },
});
