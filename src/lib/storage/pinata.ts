import { serverEnv } from "@/lib/env/server";

type PinResponse = { IpfsHash: string };

export type PinataMetadata = {
  name?: string;
  keyValues?: Record<string, string>;
};

const PINATA_PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

function getPinataJwt() {
  if (!serverEnv.PINATA_JWT) {
    throw new Error("PINATA_JWT is required to upload metadata to IPFS.");
  }
  return serverEnv.PINATA_JWT;
}

function toPinataApiMetadata(
  metadata: PinataMetadata | undefined,
): undefined | { name?: string; keyvalues?: Record<string, string> } {
  if (!metadata) return undefined;

  return {
    name: metadata.name,
    keyvalues: metadata.keyValues,
  };
}

export async function uploadJsonToIPFS(
  payload: unknown,
  options?: { cidVersion?: 0 | 1; metadata?: PinataMetadata },
) {
  const jwt = getPinataJwt();

  const body: Record<string, unknown> = {
    pinataContent: payload,
  };

  const metadata = toPinataApiMetadata(options?.metadata);
  if (metadata) body.pinataMetadata = metadata;
  if (options?.cidVersion !== undefined) {
    body.pinataOptions = { cidVersion: options.cidVersion };
  }

  let response: PinResponse;
  let rawBody = "";

  try {
    const res = await fetch(PINATA_PIN_JSON_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
    if (error instanceof Error && error.message.startsWith("Pinata upload failed")) {
      throw error;
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

export async function uploadFileToIPFS(input: {
  bytes: Uint8Array;
  fileName: string;
  contentType: string;
  cidVersion?: 0 | 1;
  metadata?: PinataMetadata;
}) {
  const jwt = getPinataJwt();

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
        Authorization: `Bearer ${jwt}`,
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
    if (error instanceof Error && error.message.startsWith("Pinata upload failed")) {
      throw error;
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
