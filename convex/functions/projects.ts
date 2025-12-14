import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "../_generated/server";
import { v } from "convex/values";
import { getUserByWallet } from "./_helpers";

export const create = mutation({
  args: {
    wallet: v.string(),
    title: v.string(),
    localId: v.optional(v.string()),
  },
  handler: async (
    { db }: MutationCtx,
    {
      wallet,
      title,
      localId,
    }: { wallet: string; title: string; localId?: string },
  ) => {
    const user = await getUserByWallet(db, wallet);
    if (!user) {
      throw new Error("User must exist before creating a project.");
    }

    const now = Date.now();
    const projectId = await db.insert("projects", {
      owner: user._id,
      localId,
      title,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    return { id: projectId };
  },
});

export const listByWallet = query({
  args: { wallet: v.string() },
  handler: async ({ db }: QueryCtx, { wallet }: { wallet: string }) => {
    const user = await getUserByWallet(db, wallet);
    if (!user) return [];

    const projects = await db
      .query("projects")
      .withIndex("by_owner", (q: any) => q.eq("owner", user._id))
      .order("desc")
      .collect();

    return projects.map((project: any) => ({
      id: project._id,
      localId: project.localId ?? null,
      title: project.title,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));
  },
});

export const getByLocalId = query({
  args: { wallet: v.string(), localId: v.string() },
  handler: async (
    { db }: QueryCtx,
    { wallet, localId }: { wallet: string; localId: string },
  ) => {
    const user = await getUserByWallet(db, wallet);
    if (!user) return null;

    return db
      .query("projects")
      .withIndex("by_owner_localId", (q: any) =>
        q.eq("owner", user._id).eq("localId", localId),
      )
      .unique();
  },
});
