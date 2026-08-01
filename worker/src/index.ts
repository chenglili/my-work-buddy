interface NotificationState {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface WorkerEnv {
  ALLOWED_ORIGIN: string;
  FEISHU_WEBHOOK_URL: string;
  NOTIFICATION_STATE: NotificationState;
}

type RequestFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const NOTIFICATION_PATH = "/notify/daily-ready";
const NOTIFICATION_EVENT = "daily-ready";
const NOTIFICATION_TEXT = "任务已完成";
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

const shanghaiDateKey = (now: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

const jsonResponse = (body: Record<string, unknown>, status: number, origin?: string) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    ...(origin ? corsHeaders(origin) : {}),
  },
});

const isDailyReadyBody = (value: unknown, expectedDateKey: string): value is { dateKey: string; event: string } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  const keys = Object.keys(body).sort();
  return keys.length === 2
    && keys[0] === "dateKey"
    && keys[1] === "event"
    && body.dateKey === expectedDateKey
    && body.event === NOTIFICATION_EVENT;
};

const feishuAccepted = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const response = value as { code?: unknown; StatusCode?: unknown };
  return response.code === 0 || response.StatusCode === 0;
};

export const handleRequest = async (
  request: Request,
  env: WorkerEnv,
  now = new Date(),
  requestFeishu: RequestFunction = fetch,
): Promise<Response> => {
  const url = new URL(request.url);
  if (url.pathname !== NOTIFICATION_PATH) return jsonResponse({ error: "not-found" }, 404);

  const origin = request.headers.get("Origin") ?? "";
  if (origin !== env.ALLOWED_ORIGIN) return jsonResponse({ error: "origin-not-allowed" }, 403);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return jsonResponse({ error: "method-not-allowed" }, 405, origin);
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ error: "invalid-content-type" }, 415, origin);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid-json" }, 400, origin);
  }

  const today = shanghaiDateKey(now);
  if (!isDailyReadyBody(body, today)) return jsonResponse({ error: "invalid-event" }, 400, origin);

  const notificationKey = `${NOTIFICATION_EVENT}:${today}`;
  if (await env.NOTIFICATION_STATE.get(notificationKey)) {
    return jsonResponse({ status: "already-sent" }, 200, origin);
  }

  let feishuResponse: Response;
  try {
    feishuResponse = await requestFeishu(env.FEISHU_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ msg_type: "text", content: { text: NOTIFICATION_TEXT } }),
    });
  } catch {
    return jsonResponse({ error: "notification-unavailable" }, 502, origin);
  }

  let feishuBody: unknown;
  try {
    feishuBody = await feishuResponse.json();
  } catch {
    return jsonResponse({ error: "notification-rejected" }, 502, origin);
  }
  if (!feishuResponse.ok || !feishuAccepted(feishuBody)) {
    return jsonResponse({ error: "notification-rejected" }, 502, origin);
  }

  await env.NOTIFICATION_STATE.put(notificationKey, now.toISOString(), { expirationTtl: SEVEN_DAYS_SECONDS });
  return jsonResponse({ status: "sent" }, 200, origin);
};

export default {
  fetch(request: Request, env: WorkerEnv) {
    return handleRequest(request, env);
  },
};
