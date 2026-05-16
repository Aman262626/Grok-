import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const b64Image = buffer.toString("base64");

    const imgbbForm = new URLSearchParams();
    imgbbForm.append("key", CONFIG.IMGBB_API_KEY);
    imgbbForm.append("image", b64Image);
    imgbbForm.append("name", file.name);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: imgbbForm,
    });

    const data = await res.json();

    if (data.success && data.data?.url) {
      return NextResponse.json({
        success: true,
        data: { url: data.data.url },
        code: 200,
      });
    }

    return NextResponse.json(
      { success: false, error: "Upload failed", raw: data },
      { status: 500 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
