import { NextRequest, NextResponse } from "next/server";
import { generateIdentity, httpGetBuffer } from "@/lib/engine";
import { CONFIG } from "@/lib/config";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  try {
    const ident = generateIdentity();
    const res = await httpGetBuffer(url, {
      "User-Agent": ident.ua,
      Referer: CONFIG.ORIGIN_URL,
      Accept: "*/*",
    });

    if (res.status < 200 || res.status >= 300) {
      return new NextResponse("Failed to fetch video", { status: 502 });
    }

    const contentType = (res.headers["content-type"] as string) || "video/mp4";
    const contentLength = (res.headers["content-length"] as string) || "";

    let filename = url.split("/").pop()?.split("?")[0] || "video.mp4";
    if (!filename.endsWith(".mp4")) {
      filename += ".mp4";
    }

    return new NextResponse(new Uint8Array(res.body), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": contentLength,
        "Accept-Ranges": "bytes",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`[PROXY ERROR] ${message}`);
    return new NextResponse(message, { status: 500 });
  }
}
