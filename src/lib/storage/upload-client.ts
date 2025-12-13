export type StorageUploadKind = "video" | "thumbnail";

type UploadInitResponse =
  | {
      strategy: "single";
      key: string;
      publicUrl: string;
      uploadUrl: string;
      requiredHeaders: Record<string, string>;
      expiresInSeconds: number;
    }
  | {
      strategy: "multipart";
      key: string;
      publicUrl: string;
      uploadId: string;
      partSizeBytes: number;
      expiresInSeconds: number;
    };

type UploadProgress = {
  uploadedBytes: number;
  totalBytes: number;
  partNumber: number;
  totalParts: number;
};

type StoredMultipartSession = {
  key: string;
  uploadId: string;
  partSizeBytes: number;
  sizeBytes: number;
  fileName: string;
  contentType: string;
  createdAt: number;
};

function getUploadSessionStorageKey(input: {
  wallet: string;
  projectId: string;
  exportId: string;
  kind: StorageUploadKind;
}) {
  return [
    "cliplore",
    "b2",
    "multipart",
    input.wallet.toLowerCase(),
    input.projectId,
    input.exportId,
    input.kind,
  ].join(":");
}

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T;
  return data;
}

function formatFetchFailureMessage(err: unknown) {
  const suffix =
    err instanceof Error && err.message
      ? ` (${err.message})`
      : err
        ? ` (${String(err)})`
        : "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "this origin";
  return `Upload request failed${suffix}. This is usually caused by blocked cross-origin PUT (CORS) or an invalid Backblaze endpoint. Ensure your B2 bucket CORS allows PUT from ${origin} and your presigned upload URL uses https.`;
}

function inferContentType(kind: StorageUploadKind, file: File) {
  if (file.type) return file.type;
  return kind === "video" ? "video/mp4" : "image/png";
}

async function initUpload(input: {
  wallet: string;
  projectId: string;
  exportId: string;
  kind: StorageUploadKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}): Promise<UploadInitResponse> {
  const res = await fetch("/api/storage/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await readJson<{ error?: string } & Partial<UploadInitResponse>>(
    res,
  );
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to initialize upload");
  }

  if (data.strategy !== "single" && data.strategy !== "multipart") {
    throw new Error("Storage returned an invalid upload strategy");
  }

  return data as UploadInitResponse;
}

async function signPart(input: {
  key: string;
  uploadId: string;
  partNumber: number;
}): Promise<{ uploadUrl: string }> {
  const res = await fetch("/api/storage/multipart/sign-part", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJson<{ uploadUrl?: string; error?: string }>(res);
  if (!res.ok || !data.uploadUrl) {
    throw new Error(data.error ?? "Failed to sign multipart upload part");
  }
  return { uploadUrl: data.uploadUrl };
}

async function listParts(input: { key: string; uploadId: string }) {
  const url = new URL("/api/storage/multipart/list-parts", window.location.origin);
  url.searchParams.set("key", input.key);
  url.searchParams.set("uploadId", input.uploadId);

  const res = await fetch(url.toString(), { method: "GET" });
  const data = await readJson<
    | { parts: Array<{ partNumber: number; etag: string; size: number }> }
    | { error: string }
  >(res);

  if (!res.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "Failed to list upload parts");
  }

  return data.parts;
}

async function completeMultipart(input: {
  key: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}): Promise<{ publicUrl: string }> {
  const res = await fetch("/api/storage/multipart/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await readJson<{ publicUrl?: string; error?: string }>(res);
  if (!res.ok || !data.publicUrl) {
    throw new Error(data.error ?? "Failed to complete multipart upload");
  }

  return { publicUrl: data.publicUrl };
}

export async function uploadFileToB2(input: {
  wallet: `0x${string}`;
  projectId: string;
  exportId: string;
  kind: StorageUploadKind;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}) {
  const contentType = inferContentType(input.kind, input.file);
  const totalBytes = input.file.size;
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    throw new Error("File is empty.");
  }

  const sessionKey =
    typeof window !== "undefined"
      ? getUploadSessionStorageKey({
          wallet: input.wallet,
          projectId: input.projectId,
          exportId: input.exportId,
          kind: input.kind,
        })
      : null;

  const loadSession = (): StoredMultipartSession | null => {
    if (!sessionKey) return null;
    const raw = window.localStorage.getItem(sessionKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StoredMultipartSession;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof parsed.uploadId !== "string" ||
        typeof parsed.key !== "string" ||
        typeof parsed.partSizeBytes !== "number" ||
        typeof parsed.sizeBytes !== "number"
      ) {
        return null;
      }
      if (
        parsed.sizeBytes !== totalBytes ||
        parsed.fileName !== input.file.name ||
        parsed.contentType !== contentType
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  };

  const saveSession = (session: StoredMultipartSession) => {
    if (!sessionKey) return;
    window.localStorage.setItem(sessionKey, JSON.stringify(session));
  };

  const clearSession = () => {
    if (!sessionKey) return;
    window.localStorage.removeItem(sessionKey);
  };

  const existing = loadSession();

  const init =
    existing ??
    (await initUpload({
      wallet: input.wallet,
      projectId: input.projectId,
      exportId: input.exportId,
      kind: input.kind,
      fileName: input.file.name,
      contentType,
      sizeBytes: totalBytes,
    }));

  if ("strategy" in init && init.strategy === "single") {
    let putRes: Response;
    try {
      putRes = await fetch(init.uploadUrl, {
        method: "PUT",
        headers: init.requiredHeaders,
        body: input.file,
        signal: input.signal,
      });
    } catch (err) {
      throw new Error(formatFetchFailureMessage(err));
    }

    if (!putRes.ok) {
      const text = await putRes.text();
      throw new Error(`Upload failed: ${putRes.status} ${text}`);
    }

    return { key: init.key, url: init.publicUrl };
  }

  const multipart =
    "strategy" in init && init.strategy === "multipart"
      ? init
      : (init as StoredMultipartSession);

  const uploadId = multipart.uploadId;
  const key = multipart.key;
  const partSizeBytes = multipart.partSizeBytes;

  saveSession({
    key,
    uploadId,
    partSizeBytes,
    sizeBytes: totalBytes,
    fileName: input.file.name,
    contentType,
    createdAt: Date.now(),
  });

  try {
    const totalParts = Math.ceil(totalBytes / partSizeBytes);
    const existingParts = await listParts({ key, uploadId });

    const uploadedMap = new Map<number, { etag: string; size: number }>();
    for (const part of existingParts) {
      if (part.partNumber >= 1) {
        uploadedMap.set(part.partNumber, { etag: part.etag, size: part.size });
      }
    }

    let uploadedBytes = 0;
    for (const p of uploadedMap.values()) uploadedBytes += p.size;

    input.onProgress?.({
      uploadedBytes,
      totalBytes,
      partNumber: Math.min(uploadedMap.size + 1, totalParts),
      totalParts,
    });

    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      if (uploadedMap.has(partNumber)) continue;

      const start = (partNumber - 1) * partSizeBytes;
      const end = Math.min(start + partSizeBytes, totalBytes);
      const chunk = input.file.slice(start, end);

      const { uploadUrl } = await signPart({ key, uploadId, partNumber });

      let res: Response;
      try {
        res = await fetch(uploadUrl, {
          method: "PUT",
          body: chunk,
          signal: input.signal,
        });
      } catch (err) {
        throw new Error(formatFetchFailureMessage(err));
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Part ${partNumber} failed: ${res.status} ${text}`);
      }

      uploadedBytes += chunk.size;
      input.onProgress?.({
        uploadedBytes,
        totalBytes,
        partNumber,
        totalParts,
      });
    }

    const finalParts = await listParts({ key, uploadId });
    const etagByPart = new Map<number, string>();
    for (const part of finalParts) {
      if (part.partNumber >= 1 && part.etag) {
        etagByPart.set(part.partNumber, part.etag);
      }
    }

    const partsForComplete: Array<{ partNumber: number; etag: string }> = [];
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      const etag = etagByPart.get(partNumber);
      if (!etag) {
        throw new Error(`Missing ETag for part ${partNumber}.`);
      }
      partsForComplete.push({ partNumber, etag });
    }

    const completed = await completeMultipart({
      key,
      uploadId,
      parts: partsForComplete,
    });

    clearSession();
    return { key, url: completed.publicUrl };
  } catch (err) {
    throw err;
  }
}
