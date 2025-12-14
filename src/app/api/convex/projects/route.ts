import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/db/convex/client";
import { getWalletSearchVariants } from "@/lib/web3/address";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  try {
    const client = getConvexClient();
    const walletCandidates = getWalletSearchVariants(wallet);
    if (!walletCandidates.length) return NextResponse.json({ projects: [] });

    const getProjectTime = (project: any) =>
      Number(project?.updatedAt ?? project?.createdAt ?? 0) || 0;

    const responses = await Promise.all(
      walletCandidates.map((candidateWallet) =>
        (client as any).query("functions/projects:listByWallet", {
          wallet: candidateWallet,
        }),
      ),
    );

    const bestByKey = new Map<string, any>();
    for (const projects of responses) {
      for (const project of projects ?? []) {
        const key = String(project?.localId ?? project?.id ?? "");
        if (!key) continue;
        const existing = bestByKey.get(key);
        if (!existing || getProjectTime(project) > getProjectTime(existing)) {
          bestByKey.set(key, project);
        }
      }
    }

    const merged = Array.from(bestByKey.values()).sort(
      (a, b) => getProjectTime(b) - getProjectTime(a),
    );
    return NextResponse.json({ projects: merged });
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
