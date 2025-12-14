import { serverEnv } from "@/lib/env/server";
import type { PinataMetadata } from "pinata-web3";

type PinResponse = { IpfsHash: string };

let pinataClientPromise: Promise<import("pinata-web3").PinataSDK> | null = null;

const PINATA_PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

async function getPinataClient() {
  if (!serverEnv.PINATA_JWT) {
    throw new Error("PINATA_JWT is required to upload metadata to IPFS.");
  }

  pinataClientPromise ??= import("pinata-web3").then(({ PinataSDK }) => {
    return new PinataSDK({ pinataJwt: serverEnv.PINATA_JWT });
  });

  return pinataClientPromise;
}

function toPinataApiMetadata(
  metadata: PinataMetadata | undefined,
): undefined | { name?: string; keyvalues?: Record<string, string> } {
  if (!metadata) return undefined;

  const keyValues = (metadata as { keyValues?: Record<string, string> }).keyValues;
  const keyvalues = (metadata as { keyvalues?: Record<string, string> }).keyvalues;

  const mergedKeyvalues = keyValues ?? keyvalues;

  return {
    name: metadata.name,
    keyvalues: mergedKeyvalues,
  };
}

export async function uploadJsonToIPFS(
  payload: unknown,
  options?: { cidVersion?: 0 | 1; metadata?: PinataMetadata },
) {
  const pinata = await getPinataClient();

  let response: PinResponse;
  try {
    response = (await pinata.upload.json(payload as object, {
      cidVersion: options?.cidVersion,
      metadata: options?.metadata,
    })) as PinResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Pinata upload failed: ${message}`);
  }

  if (!response?.IpfsHash) {
    throw new Error("Pinata upload failed: missing IpfsHash in response.");
  }

  return `ipfs://${response.IpfsHash}`;
}

export async function uploadFileToIPFS(input: {
  bytes: Uint8Array;
  fileName: string;
  contentType: string;
  cidVersion?: 0 | 1;
  metadata?: PinataMetadata;
}) {
  if (!serverEnv.PINATA_JWT) {
    throw new Error("PINATA_JWT is required to upload metadata to IPFS.");
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([input.bytes], { type: input.contentType }),
    input.fileName,
  );

  const metadata = toPinataApiMetadata(input.metadata);
  if (metadata) {
    form.append("pinataMetadata", JSON.stringify(metadata));
  }

  if (input.cidVersion !== undefined) {
    form.append("pinataOptions", JSON.stringify({ cidVersion: input.cidVersion }));
  }

  let response: PinResponse;
  let rawBody = "";

  try {
    const res = await fetch(PINATA_PIN_FILE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.PINATA_JWT}`,
      },
      body: form,
    });

    rawBody = await res.text();

    if (!res.ok) {
      throw new Error(
        `Pinata upload failed (${res.status} ${res.statusText}): ${rawBody || "empty body"}`,
      );
    }

    response = JSON.parse(rawBody) as PinResponse;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Pinata upload failed: invalid JSON response: ${rawBody || "empty body"}`,
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Pinata upload failed: ${message}`);
  }

  if (!response?.IpfsHash) {
    throw new Error(
      `Pinata upload failed: missing IpfsHash in response: ${rawBody || "empty body"}`,
    );
  }

  return `ipfs://${response.IpfsHash}`;
}
