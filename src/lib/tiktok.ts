import crypto from "crypto";

const TIKTOK_API_ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

interface TikTokUserContext {
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  externalId?: string;
}

interface TikTokEventPayload {
  eventName: string;
  eventId?: string;
  user?: TikTokUserContext;
  properties?: Record<string, any>;
  pageUrl?: string;
}

function hashValue(val?: string): string | undefined {
  if (!val) return undefined;
  return crypto.createHash("sha256").update(val.trim().toLowerCase()).digest("hex");
}

export async function sendTikTokServerEvent(payload: TikTokEventPayload) {
  const pixelId = process.env.TIKTOK_PIXEL_ID;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return { success: false, reason: "TikTok credentials missing in environment" };
  }

  try {
    const userPayload: Record<string, any> = {};
    if (payload.user?.email) userPayload.email = hashValue(payload.user.email);
    if (payload.user?.phone) userPayload.phone_number = hashValue(payload.user.phone);
    if (payload.user?.externalId) userPayload.external_id = hashValue(payload.user.externalId);
    if (payload.user?.ip) userPayload.ip = payload.user.ip;
    if (payload.user?.userAgent) userPayload.user_agent = payload.user.userAgent;

    const body = {
      event_source: "web",
      event_source_id: pixelId,
      data: [
        {
          event: payload.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: payload.eventId || crypto.randomUUID(),
          user: userPayload,
          page: payload.pageUrl ? { url: payload.pageUrl } : undefined,
          properties: payload.properties || {},
        },
      ],
    };

    const res = await fetch(TIKTOK_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (error) {
    console.error("TikTok Events API Error:", error);
    return { success: false, error };
  }
}

