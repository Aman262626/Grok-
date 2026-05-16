import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { getHeaders } from "@/lib/engine";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get("taskId");
  const uniqueId = searchParams.get("uniqueId");
  const taskType = searchParams.get("type") || "video";

  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  try {
    const headers = getHeaders(uniqueId || undefined);
    const channel =
      taskType === "image" ? "GROK_TEXT_IMAGE" : "GROK_IMAGINE";

    const res = await fetch(
      `${CONFIG.API_BASE}/ai/${taskId}?channel=${channel}`,
      {
        headers,
      }
    );

    const pollData = await res.json();
    const data = pollData.data || {};

    const result: Record<string, unknown> = {
      status: "processing",
      progress: 0,
    };

    if (data.completeData) {
      try {
        const inner = JSON.parse(data.completeData);
        if (
          inner.data &&
          inner.data.result_urls &&
          inner.data.result_urls.length > 0
        ) {
          result.status = "completed";
          result.videoUrl = inner.data.result_urls[0];
          result.urls = inner.data.result_urls;
        } else {
          result.status = "failed";
          result.error = `No video returned: ${JSON.stringify(inner).slice(0, 200)}`;
        }
      } catch {
        result.status = "failed";
        result.error = "Failed to parse response";
      }
    } else if (data.failMsg) {
      result.status = "failed";
      result.error = data.failMsg;
    } else {
      if (data.progress) {
        result.progress = Math.round(parseFloat(data.progress) * 100);
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
