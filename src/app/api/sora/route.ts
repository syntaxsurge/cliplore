import { NextResponse } from "next/server";
import { createSoraJob, getSoraJob } from "@/features/ai/services/sora";

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt, seconds, size } = body as {
    prompt?: string;
    seconds?: "4" | "8" | "12";
    size?: "720x1280" | "1280x720" | "1024x1792" | "1792x1024";
  };

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const jobId = await createSoraJob({ prompt, seconds, size });
    return NextResponse.json({ jobId });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to create Sora job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const job = await getSoraJob(jobId);
    return NextResponse.json(job);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch job status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
