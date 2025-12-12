import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/db/convex/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  try {
    const client = getConvexClient();
    const stats = await (client as any).query("functions/projects:stats", {
      wallet,
    });
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Convex projects:stats error", error);
    return NextResponse.json(
      { error: "Failed to load project stats from Convex" },
      { status: 500 },
    );
  }
}
