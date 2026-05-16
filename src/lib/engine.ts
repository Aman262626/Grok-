import { CONFIG } from "./config";
import { v4 as uuidv4 } from "uuid";
import https from "https";
import http from "http";

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface HttpResponse {
  status: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}

export function httpRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  } = {}
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const lib = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
      rejectUnauthorized: false,
      timeout: options.timeout || 30000,
    };

    const req = lib.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        const responseHeaders: Record<string, string | string[] | undefined> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          responseHeaders[key] = value;
        }
        resolve({
          status: res.statusCode || 0,
          body,
          headers: responseHeaders,
        });
      });
      res.on("error", reject);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out after ${options.timeout || 30000}ms`));
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

export function httpGetBuffer(
  url: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: Buffer; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const lib = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers,
      rejectUnauthorized: false,
      timeout: 60000,
    };

    const req = lib.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const responseHeaders: Record<string, string | string[] | undefined> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          responseHeaders[key] = value;
        }
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks),
          headers: responseHeaders,
        });
      });
      res.on("error", reject);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    req.on("error", reject);
    req.end();
  });
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
