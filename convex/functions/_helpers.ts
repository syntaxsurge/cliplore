import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function getUserByWallet(
  db: QueryCtx["db"] | MutationCtx["db"],
  wallet: string,
) {
  return db
    .query("users")
    .withIndex("by_wallet", (q: any) => q.eq("wallet", wallet))
    .unique();
}

