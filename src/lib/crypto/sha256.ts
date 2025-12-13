export async function sha256HexFromArrayBuffer(
  buffer: ArrayBuffer,
): Promise<`0x${string}`> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(digest);
  let hex = "0x";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex as `0x${string}`;
}

export async function sha256HexFromFile(file: File): Promise<`0x${string}`> {
  return sha256HexFromArrayBuffer(await file.arrayBuffer());
}

