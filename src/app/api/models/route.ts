import { NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";

export async function GET() {
  const models = Object.entries(CONFIG.MODEL_MAP).map(([id, v]) => ({
    id,
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: "ximagine",
    name: v.name,
  }));

  return NextResponse.json({ object: "list", data: models });
}
