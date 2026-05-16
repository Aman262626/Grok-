export const CONFIG = {
  PROJECT_NAME: "Ximagine Pro - Video Generation Engine",
  VERSION: "2.2.0 (Chimera Synthesis)",
  API_BASE: "https://api.ximagine.io/aimodels/api/v1",
  ORIGIN_URL: "https://ximagine.io",
  UPLOAD_URL: "https://upload.aiquickdraw.com/upload",
  IMGBB_API_KEY: "2cb564ac0e0c2a6f7f390aa1f8a0b800",
  AUTH_TOKEN:
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJsb2dpblR5cGUiOiJsb2dpbiIsImxvZ2luSWQiOiJ4aW1hZ2luZS5pby11c2VyLTc2MjkzNCIsInJuU3RyIjoiUE9GbHBJRm1vOTlyalBLd2RRT1pac3hSRkg0NDJJSmcifQ.V8QaTImPoiZe_PyL0bkkHMMNwEltTTPeAhK93QLLKI4",
  MODEL_MAP: {
    "grok-video-normal": {
      type: "video",
      mode: "normal",
      channel: "GROK_IMAGINE",
      pageId: 901,
      name: "Standard Realistic",
    },
    "grok-video-fun": {
      type: "video",
      mode: "fun",
      channel: "GROK_IMAGINE",
      pageId: 901,
      name: "Fun Cartoon",
    },
    "grok-video-spicy": {
      type: "video",
      mode: "spicy",
      channel: "GROK_IMAGINE",
      pageId: 901,
      name: "Spicy Mode",
    },
    "grok-video-image": {
      type: "video",
      mode: "normal",
      channel: "GROK_IMAGINE",
      pageId: 901,
      name: "Image to Video",
    },
    "grok-image": {
      type: "image",
      mode: "normal",
      channel: "GROK_TEXT_IMAGE",
      pageId: 901,
      name: "Text to Image",
    },
  } as Record<
    string,
    { type: string; mode: string; channel: string; pageId: number; name: string }
  >,
  DEFAULT_MODEL: "grok-video-normal",
  RATIO_MAP: {
    "1:1": "1:1",
    "16:9": "16:9",
    "9:16": "2:3",
  } as Record<string, string>,
};
