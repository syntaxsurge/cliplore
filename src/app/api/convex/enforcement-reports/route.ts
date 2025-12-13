import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/db/convex/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const targetIpId = searchParams.get("targetIpId");

  if (!wallet && !targetIpId) {
    return NextResponse.json(
      { error: "wallet or targetIpId is required" },
      { status: 400 },
    );
  }

  try {
    const client = getConvexClient();

    if (wallet) {
      const reports = await (client as any).query(
        "functions/enforcementReports:listByWallet",
        { wallet },
      );
      return NextResponse.json({ reports });
    }

    const reports = await (client as any).query(
      "functions/enforcementReports:listByTargetIpId",
      { targetIpId },
    );
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Convex enforcementReports:list error", error);
    return NextResponse.json(
      { error: "Failed to load enforcement reports from Convex" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
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
  } = body as {
    wallet?: string;
    targetIpId?: string;
    protectedIpId?: string;
    targetTag?: string;
    liveness?: number;
    bond?: string;
    suspectUrl?: string;
    suspectSha256?: string;
    suspectFileName?: string;
    suspectFileType?: string;
    evidenceCid?: string;
    evidenceUri?: string;
    disputeId?: string;
    disputeTxHash?: string;
    chainId?: number;
  };

  if (!wallet || !targetIpId || !targetTag || !liveness || !evidenceCid || !evidenceUri) {
    return NextResponse.json(
      {
        error:
          "wallet, targetIpId, targetTag, liveness, evidenceCid, and evidenceUri are required",
      },
      { status: 400 },
    );
  }

  try {
    const client = getConvexClient();
    await (client as any).mutation("functions/users:upsert", { wallet });

    const report = await (client as any).mutation(
      "functions/enforcementReports:create",
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
      },
    );

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Convex enforcementReports:create error", error);
    return NextResponse.json(
      { error: "Failed to create enforcement report in Convex" },
      { status: 500 },
    );
  }
}

