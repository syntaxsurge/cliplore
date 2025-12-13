import { NextResponse } from "next/server";
import { z } from "zod";
import { createSoraJob, getSoraJob } from "@/features/ai/services/sora";
import { getOpenAIKeyCookie } from "@/lib/openai/byok-cookie";

export const runtime = "nodejs";

const createSchema = z.object({
  model: z.enum(["sora-2", "sora-2-pro"]).optional(),
  prompt: z.string().min(1),
  seconds: z.union([z.literal(4), z.literal(8), z.literal(12)]).optional(),
  size: z
    .enum(["720x1280", "1280x720", "1024x1792", "1792x1024"])
    .optional(),
});

export async function POST(req: Request) {
  const apiKey = await getOpenAIKeyCookie();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI key not set. Go to Settings → AI to add your API key." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") || "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const jobId = await createSoraJob(parsed.data, { apiKey });
    return NextResponse.json({ jobId, statusUrl: `/api/sora?jobId=${jobId}` });
  } catch (error) {
    console.error(error);
    const status =
      typeof (error as { status?: unknown } | null)?.status === "number"
        ? (error as { status: number }).status
        : null;

    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: "OpenAI key is invalid or expired. Update it in Settings → AI." },
        { status: 401 },
      );
    }

    if (status === 429) {
      return NextResponse.json(
        { error: "OpenAI rate limit exceeded. Try again in a moment." },
        { status: 429 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to create Sora job";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const apiKey = await getOpenAIKeyCookie();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI key not set. Go to Settings → AI to add your API key." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const job = await getSoraJob(jobId, { apiKey });
    return NextResponse.json({
      ...job,
      contentUrl:
        job.status === "completed" ? `/api/sora/content?jobId=${jobId}` : null,
    });
  } catch (error) {
    console.error(error);
    const status =
      typeof (error as { status?: unknown } | null)?.status === "number"
        ? (error as { status: number }).status
        : null;

    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: "OpenAI key is invalid or expired. Update it in Settings → AI." },
        { status: 401 },
      );
    }

    if (status === 429) {
      return NextResponse.json(
        { error: "OpenAI rate limit exceeded. Try again in a moment." },
        { status: 429 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to fetch job status";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
