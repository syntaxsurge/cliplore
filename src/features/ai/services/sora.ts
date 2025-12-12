import OpenAI from "openai";
import { serverEnv } from "@/lib/env/server";

const apiKey = serverEnv.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

const getVideosClient = () => {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is required to use the Sora Videos API.");
  }
  const client = (openai as any).videos ?? (openai as any).beta?.videos;
  if (!client) {
    throw new Error("OpenAI client is missing the Videos API.");
  }
  return client;
};

export type SoraJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  video_url?: string;
};

export async function createSoraJob(params: {
  prompt: string;
  seconds?: "4" | "8" | "12";
  size?: "720x1280" | "1280x720" | "1024x1792" | "1792x1024";
}) {
  const videosClient = getVideosClient();

  const job = await videosClient.create({
    model: "sora-2",
    prompt: params.prompt,
    seconds: params.seconds ?? "8",
    size: params.size ?? "1280x720",
  });

  return job.id;
}

export async function getSoraJob(jobId: string): Promise<SoraJob> {
  const videosClient = getVideosClient();

  const job = await videosClient.retrieve(jobId);

  if (job.status === "completed") {
    const content = await videosClient.content(jobId);
    return {
      id: job.id,
      status: "completed",
      video_url: content.url,
    };
  }

  return {
    id: job.id,
    status: job.status as SoraJob["status"],
  };
}
