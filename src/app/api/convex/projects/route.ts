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
    const projects = await (client as any).query(
      "functions/projects:listByWallet",
      { wallet },
    );
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Convex projects:listByWallet error", error);
    return NextResponse.json(
      { error: "Failed to load projects from Convex" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { wallet, title, localId } = body as {
    wallet?: string;
    title?: string;
    localId?: string;
  };

  if (!wallet || !title) {
    return NextResponse.json(
      { error: "wallet and title are required" },
      { status: 400 },
    );
  }

  try {
    const client = getConvexClient();
    await (client as any).mutation("functions/users:upsert", { wallet });
    const project = await (client as any).mutation(
      "functions/projects:create",
      {
        wallet,
        title,
        localId,
      },
    );
    return NextResponse.json({ project });
  } catch (error) {
    console.error("Convex projects:create error", error);
    return NextResponse.json(
      { error: "Failed to create project in Convex" },
      { status: 500 },
    );
  }
}
