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
    localProjectId: v.string(),
    ipId: v.string(),
    title: v.string(),
    summary: v.string(),
    terms: v.string(),
    videoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    licenseTermsId: v.optional(v.string()),
    txHash: v.optional(v.string()),
  },
  handler: async (
    { db }: MutationCtx,
    {
      wallet,
      localProjectId,
      ipId,
      title,
      summary,
      terms,
      videoUrl,
      thumbnailUrl,
      licenseTermsId,
      txHash,
    }: {
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
    },
  ) => {
    const user = await getUserByWallet(db, wallet);
    if (!user) {
      throw new Error("User must exist before registering IP.");
    }

    const project = await db
      .query("projects")
      .withIndex("by_owner_localId", (q: any) =>
        q.eq("owner", user._id).eq("localId", localProjectId),
      )
      .unique();

    if (!project) {
      throw new Error("Project not found for this wallet.");
    }

    const now = Date.now();
    const normalizedIpId = ipId.toLowerCase();
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
      createdAt: now,
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
      licensorWallet: record.licensorWallet,
      createdAt: record.createdAt,
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
      licensorWallet: record.licensorWallet,
      createdAt: record.createdAt,
    };
  },
});
