import { NextResponse } from "next/server";
import { getSoraContentResponse } from "@/features/ai/services/sora";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const res = await getSoraContentResponse(jobId);
    const contentType = res.headers.get("content-type") ?? "video/mp4";

    if (contentType.includes("application/json")) {
      const data = (await res.json()) as { url?: string; error?: string };
      if (!data.url) {
        return NextResponse.json(
          { error: data.error ?? "OpenAI returned no content url" },
          { status: 500 },
        );
      }

      const proxied = await fetch(data.url);
      if (!proxied.ok) {
        const text = await proxied.text();
        return NextResponse.json(
          { error: `Failed to fetch video content: ${proxied.status} ${text}` },
          { status: 502 },
        );
      }

      const proxiedType = proxied.headers.get("content-type") ?? "video/mp4";
      return new Response(proxied.body, {
        headers: {
          "Content-Type": proxiedType,
          "Cache-Control": "no-store",
          "Content-Disposition": `inline; filename=\"${jobId}.mp4\"`,
        },
      });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename=\"${jobId}.mp4\"`,
      },
    });
  } catch (error) {
    console.error("Sora content proxy error", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch video content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

