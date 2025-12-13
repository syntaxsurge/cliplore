import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { v } from "convex/values";
import { getUserByWallet } from "./_helpers";

function toReportResponse(record: any) {
  return {
    id: record._id,
    reporterWallet: record.reporterWallet,
    targetIpId: record.targetIpId,
    protectedIpId: record.protectedIpId ?? null,
    targetTag: record.targetTag,
    liveness: record.liveness,
    bond: record.bond ?? null,
    suspectUrl: record.suspectUrl ?? null,
    suspectSha256: record.suspectSha256 ?? null,
    suspectFileName: record.suspectFileName ?? null,
    suspectFileType: record.suspectFileType ?? null,
    evidenceCid: record.evidenceCid,
    evidenceUri: record.evidenceUri,
    disputeId: record.disputeId ?? null,
    disputeTxHash: record.disputeTxHash ?? null,
    chainId: record.chainId ?? null,
    createdAt: record.createdAt,
  };
}

export const create = mutation({
  args: {
    wallet: v.string(),
    targetIpId: v.string(),
    protectedIpId: v.optional(v.string()),
    targetTag: v.string(),
    liveness: v.number(),
    bond: v.optional(v.string()),
    suspectUrl: v.optional(v.string()),
    suspectSha256: v.optional(v.string()),
    suspectFileName: v.optional(v.string()),
    suspectFileType: v.optional(v.string()),
    evidenceCid: v.string(),
    evidenceUri: v.string(),
    disputeId: v.optional(v.string()),
    disputeTxHash: v.optional(v.string()),
    chainId: v.optional(v.number()),
  },
  handler: async (
    { db }: MutationCtx,
    {
      wallet,
      targetIpId,
      protectedIpId,
      targetTag,
      liveness,
      bond,
      suspectUrl,
      suspectSha256,
      suspectFileName,
      suspectFileType,
      evidenceCid,
      evidenceUri,
      disputeId,
      disputeTxHash,
      chainId,
    }: {
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
    },
  ) => {
    const user = await getUserByWallet(db, wallet);
    if (!user) {
      throw new Error("User must exist before creating an enforcement report.");
    }

    const now = Date.now();
    const insert: any = {
      reporterWallet: wallet,
      targetIpId: targetIpId.toLowerCase(),
      targetTag,
      liveness,
      evidenceCid,
      evidenceUri,
      createdAt: now,
    };

    if (protectedIpId !== undefined) {
      insert.protectedIpId = protectedIpId.toLowerCase();
    }
    if (bond !== undefined) insert.bond = bond;
    if (suspectUrl !== undefined) insert.suspectUrl = suspectUrl;
    if (suspectSha256 !== undefined) insert.suspectSha256 = suspectSha256;
    if (suspectFileName !== undefined) insert.suspectFileName = suspectFileName;
    if (suspectFileType !== undefined) insert.suspectFileType = suspectFileType;
    if (disputeId !== undefined) insert.disputeId = disputeId;
    if (disputeTxHash !== undefined) insert.disputeTxHash = disputeTxHash;
    if (chainId !== undefined) insert.chainId = chainId;

    const id = await db.insert("enforcementReports", insert);
    return { id };
  },
});

export const listByWallet = query({
  args: { wallet: v.string() },
  handler: async ({ db }: QueryCtx, { wallet }: { wallet: string }) => {
    const records = await db
      .query("enforcementReports")
      .withIndex("by_reporterWallet", (q: any) =>
        q.eq("reporterWallet", wallet),
      )
      .collect();

    return records
      .sort((a: any, b: any) => b.createdAt - a.createdAt)
      .map(toReportResponse);
  },
});

export const listByTargetIpId = query({
  args: { targetIpId: v.string() },
  handler: async ({ db }: QueryCtx, { targetIpId }: { targetIpId: string }) => {
    const normalized = targetIpId.toLowerCase();
    const records = await db
      .query("enforcementReports")
      .withIndex("by_targetIpId", (q: any) => q.eq("targetIpId", normalized))
      .collect();

    return records
      .sort((a: any, b: any) => b.createdAt - a.createdAt)
      .map(toReportResponse);
  },
});
