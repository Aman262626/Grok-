import { NextRequest, NextResponse } from "next/server";
import { generateIdentity } from "@/lib/engine";
import { CONFIG } from "@/lib/config";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  try {
    const ident = generateIdentity();
    const res = await fetch(url, {
      headers: {
        "User-Agent": ident.ua,
        Referer: CONFIG.ORIGIN_URL,
        Accept: "*/*",
      },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch video", { status: 502 });
    }

    const contentType = res.headers.get("Content-Type") || "video/mp4";
    const contentLength = res.headers.get("Content-Length") || "";

    let filename = url.split("/").pop()?.split("?")[0] || "video.mp4";
    if (!filename.endsWith(".mp4")) {
      filename += ".mp4";
    }

    const blob = await res.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": contentLength,
        "Accept-Ranges": "bytes",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new NextResponse(message, { status: 500 });
  }
}
