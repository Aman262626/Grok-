import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { getHeaders, buildPayload, httpRequest } from "@/lib/engine";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model, aspectRatio, imageUrls } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let modelKey = model || CONFIG.DEFAULT_MODEL;
    if (!(modelKey in CONFIG.MODEL_MAP)) {
      modelKey = CONFIG.DEFAULT_MODEL;
    }
    if (imageUrls && imageUrls.length > 0) {
      modelKey = "grok-video-image";
    }

    const modelConfig = CONFIG.MODEL_MAP[modelKey];
    const uniqueId = uuidv4().replace(/-/g, "");
    const headers = getHeaders(uniqueId);
    const payload = buildPayload(
      prompt,
      modelConfig,
      aspectRatio || "1:1",
      imageUrls || []
    );

    const endpoint =
      modelConfig.type === "video"
        ? `${CONFIG.API_BASE}/ai/video/create`
        : `${CONFIG.API_BASE}/ai/grok/create`;

    console.log(`[GENERATE] model=${modelKey} endpoint=${endpoint}`);

    const res = await httpRequest(endpoint, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      timeout: 25000,
    });

    console.log(`[GENERATE] status=${res.status} body=${res.body.slice(0, 300)}`);

    let resData;
    try {
      resData = JSON.parse(res.body);
    } catch {
      return NextResponse.json(
        { error: `Invalid response from upstream: ${res.body.slice(0, 200)}` },
        { status: 502 }
      );
    }

    if (resData.code !== 200) {
      return NextResponse.json(
        { error: `Upstream rejected: ${JSON.stringify(resData).slice(0, 300)}` },
        { status: 500 }
      );
    }

    const taskId = resData.data;

    return NextResponse.json({
      success: true,
      taskId,
      uniqueId,
      type: modelConfig.type,
      model: modelKey,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`[GENERATE ERROR] ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
