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
    const user = await (client as any).query("functions/users:getByWallet", {
      wallet,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Convex users:getByWallet error", error);
    return NextResponse.json(
      { error: "Failed to load user profile from Convex" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { wallet, displayName, defaultLicensePreset } = body as {
    wallet?: string;
    displayName?: string;
    defaultLicensePreset?: string;
  };

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  try {
    const client = getConvexClient();
    const user = await (client as any).mutation("functions/users:upsert", {
      wallet,
      displayName,
      defaultLicensePreset,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Convex users:upsert error", error);
    return NextResponse.json(
      { error: "Failed to save user profile to Convex" },
      { status: 500 },
    );
  }
}
