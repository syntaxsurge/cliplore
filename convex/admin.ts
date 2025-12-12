import { mutation } from "./_generated/server";
import { v } from "convex/values";

const TABLES = ["users", "projects", "assets", "ipAssets", "soraJobs"] as const;

type TableName = (typeof TABLES)[number];

export const truncateAll = mutation({
  args: {
    secret: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.CONVEX_RESET_TOKEN;
    if (expected && args.secret !== expected) {
      throw new Error("Invalid reset token provided.");
    }

    const batchSize = Math.min(Math.max(args.batchSize ?? 200, 1), 500);
    const summary: Record<string, number> = {};

    for (const table of TABLES) {
      let deleted = 0;
      while (true) {
        const rows = await ctx.db.query(table as TableName).take(batchSize);
        if (!rows.length) {
          break;
        }
        for (const row of rows) {
          await ctx.db.delete(row._id);
        }
        deleted += rows.length;
      }
      summary[table] = deleted;
    }

    return summary;
  },
});
