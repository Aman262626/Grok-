import { CONFIG } from "./config";
import { v4 as uuidv4 } from "uuid";

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateIdentity() {
  const ip = `${getRandomInt(1, 254)}.${getRandomInt(1, 254)}.${getRandomInt(1, 254)}.${getRandomInt(1, 254)}`;
  const major = getRandomInt(128, 132);
  const build = getRandomInt(6000, 7000);
  const ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.${build}.0 Safari/537.36`;
  const secChUa = `"Google Chrome";v="${major}", "Chromium";v="${major}", "Not_A Brand";v="24"`;
  return { ip, ua, secChUa };
}

export function getHeaders(uniqueId?: string) {
  const ident = generateIdentity();
  const uid = uniqueId || uuidv4().replace(/-/g, "");
  return {
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: CONFIG.ORIGIN_URL,
    Referer: `${CONFIG.ORIGIN_URL}/`,
    "User-Agent": ident.ua,
    uniqueid: uid,
    "X-Forwarded-For": ident.ip,
    "X-Real-IP": ident.ip,
    "sec-ch-ua": ident.secChUa,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    priority: "u=1, i",
  };
}

export function buildPayload(
  prompt: string,
  modelConfig: { type: string; mode: string; channel: string; pageId: number },
  aspectRatio: string,
  imageUrls: string[]
) {
  const apiRatio = CONFIG.RATIO_MAP[aspectRatio] || aspectRatio;

  const payload: Record<string, unknown> = {
    prompt,
    channel: modelConfig.channel,
    pageId: modelConfig.pageId,
    source: "ximagine.io",
    watermarkFlag: true,
    removeWatermark: true,
    private: false,
    privateFlag: false,
    isTemp: true,
    model: "grok-imagine",
    videoType: "text-to-video",
    aspectRatio: apiRatio,
    imageUrls: [] as string[],
  };

  if (modelConfig.type === "video") {
    payload.mode = modelConfig.mode;
    if (imageUrls.length > 0) {
      payload.videoType = "image-to-video";
      payload.imageUrls = imageUrls;
    }
  }

  return payload;
}
