import { serverEnv } from "@/lib/env/server";

const OPENAI_API_BASE = "https://api.openai.com/v1";

async function openaiFetch(path: string, init: RequestInit) {
  if (!serverEnv.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to use the Sora Videos API.");
  }

  const res = await fetch(`${OPENAI_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}`,
      ...(init.headers ?? {}),
    },
  });

  return res;
}

async function openaiJson<T>(path: string, init: RequestInit) {
  const res = await openaiFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI request failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

export type SoraJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
};

export async function createSoraJob(params: {
  model?: "sora-2" | "sora-2-pro";
  prompt: string;
  seconds?: 4 | 8 | 12;
  size?: "720x1280" | "1280x720" | "1024x1792" | "1792x1024";
}) {
  const job = await openaiJson<{ id: string }>("/videos", {
    method: "POST",
    body: JSON.stringify({
      model: params.model ?? "sora-2",
      prompt: params.prompt,
      seconds: params.seconds ?? 8,
      size: params.size ?? "1280x720",
    }),
  });

  return job.id;
}

export async function getSoraJob(jobId: string): Promise<SoraJob> {
  const job = await openaiJson<{
    id: string;
    status: string;
    error?: { message?: string } | string;
  }>(`/videos/${encodeURIComponent(jobId)}`, { method: "GET" });

  const rawStatus = job.status.toLowerCase();
  const errorMessage =
    typeof job.error === "string"
      ? job.error
      : job.error?.message ?? undefined;

  if (
    rawStatus === "completed" ||
    rawStatus === "succeeded" ||
    rawStatus === "success"
  ) {
    return { id: job.id, status: "completed" };
  }

  if (
    rawStatus === "failed" ||
    rawStatus === "error" ||
    rawStatus === "cancelled" ||
    rawStatus === "canceled"
  ) {
    return { id: job.id, status: "failed", error: errorMessage };
  }

  if (rawStatus === "queued" || rawStatus === "pending") {
    return { id: job.id, status: "queued" };
  }

  return { id: job.id, status: "processing" };
}

export async function getSoraContentResponse(jobId: string) {
  const res = await openaiFetch(`/videos/${encodeURIComponent(jobId)}/content`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI content failed: ${res.status} ${text}`);
  }

  return res;
}
