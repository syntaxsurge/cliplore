import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { v } from "convex/values";

export const getByWallet = query({
  args: { wallet: v.string() },
  handler: async ({ db }: QueryCtx, { wallet }: { wallet: string }) => {
    const user = await db
      .query("users")
      .withIndex("by_wallet", (q: any) => q.eq("wallet", wallet))
      .unique();

    if (!user) return null;

    return {
      id: user._id,
      wallet: user.wallet,
      displayName: user.displayName ?? null,
      defaultLicensePreset: user.defaultLicensePreset ?? null,
      createdAt: user.createdAt,
    };
  },
});

export const upsert = mutation({
  args: {
    wallet: v.string(),
    displayName: v.optional(v.string()),
    defaultLicensePreset: v.optional(v.string()),
  },
  handler: async (
    { db }: MutationCtx,
    {
      wallet,
      displayName,
      defaultLicensePreset,
    }: {
      wallet: string;
      displayName?: string;
      defaultLicensePreset?: string;
    },
  ) => {
    const existing = await db
      .query("users")
      .withIndex("by_wallet", (q: any) => q.eq("wallet", wallet))
      .unique();

    if (existing) {
      await db.patch(existing._id, {
        displayName,
        defaultLicensePreset,
      });
      return { id: existing._id, wallet: existing.wallet };
    }

    const now = Date.now();
    const id = await db.insert("users", {
      wallet,
      displayName,
      defaultLicensePreset,
      createdAt: now,
    });

    return { id, wallet };
  },
});
