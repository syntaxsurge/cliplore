import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { evidenceBundleSchema } from "@/lib/enforcement/evidence";
import { uploadFileToIPFS } from "@/lib/storage/pinata";
import { stableJsonStringify } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = evidenceBundleSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid evidence bundle", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const evidence = result.data;
  const json = stableJsonStringify(evidence);
  const sha256 = `0x${createHash("sha256").update(json).digest("hex")}`;

  try {
    const fileName = `cliplore-enforcement-evidence-${sha256.slice(2, 14)}.json`;
    const uri = await uploadFileToIPFS({
      bytes: Buffer.from(json, "utf8"),
      fileName,
      contentType: "application/json",
      cidVersion: 0,
      metadata: {
        name: fileName,
        keyValues: {
          app: "cliplore",
          kind: "enforcement-evidence",
          schema: evidence.schema,
        },
      },
    });

    const cid = uri.startsWith("ipfs://") ? uri.slice("ipfs://".length) : uri;
    if (!cid.startsWith("Qm")) {
      throw new Error(
        `Pinned evidence CID must be CIDv0 (Qm...) for Story disputes. Got: ${cid}`,
      );
    }
    return NextResponse.json({ uri, cid, sha256 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("pin-evidence error", message);
    return NextResponse.json(
      { error: "Failed to pin evidence to IPFS", details: message },
      { status: 500 },
    );
  }
}
