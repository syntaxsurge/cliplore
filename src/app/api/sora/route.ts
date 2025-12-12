import { NextResponse } from "next/server";
import { z } from "zod";
import { createSoraJob, getSoraJob } from "@/features/ai/services/sora";

const createSchema = z.object({
  model: z.enum(["sora-2", "sora-2-pro"]).optional(),
  prompt: z.string().min(1),
  seconds: z.union([z.literal(4), z.literal(8), z.literal(12)]).optional(),
  size: z
    .enum(["720x1280", "1280x720", "1024x1792", "1792x1024"])
    .optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") || "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const jobId = await createSoraJob(parsed.data);
    return NextResponse.json({ jobId, statusUrl: `/api/sora?jobId=${jobId}` });
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
    return NextResponse.json({
      ...job,
      contentUrl:
        job.status === "completed" ? `/api/sora/content?jobId=${jobId}` : null,
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch job status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
