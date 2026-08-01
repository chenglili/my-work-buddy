import { describe, expect, it, vi } from "vitest";
import { handleRequest, type WorkerEnv } from "./index";

class MemoryNotificationState {
  values = new Map<string, string>();

  async get(key: string) {
    return this.values.get(key) ?? null;
  }

  async put(key: string, value: string) {
    this.values.set(key, value);
  }
}

const now = new Date("2026-08-01T04:00:00.000Z");
const origin = "https://chenglili.github.io";
const endpoint = "https://worker.example/notify/daily-ready";

const createEnv = (): WorkerEnv => ({
  ALLOWED_ORIGIN: origin,
  FEISHU_WEBHOOK_URL: "https://open.feishu.cn/open-apis/bot/v2/hook/private-token",
  NOTIFICATION_STATE: new MemoryNotificationState(),
});

const createRequest = (body: unknown, requestOrigin = origin) => new Request(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Origin": requestOrigin },
  body: JSON.stringify(body),
});

describe("Feishu daily-ready Worker", () => {
  it("rejects other origins, dates, event types, and extra message fields", async () => {
    const feishu = vi.fn<typeof fetch>();
    const env = createEnv();

    expect((await handleRequest(createRequest({ dateKey: "2026-08-01", event: "daily-ready" }, "https://example.com"), env, now, feishu)).status).toBe(403);
    expect((await handleRequest(createRequest({ dateKey: "2026-08-02", event: "daily-ready" }), env, now, feishu)).status).toBe(400);
    expect((await handleRequest(createRequest({ dateKey: "2026-08-01", event: "other" }), env, now, feishu)).status).toBe(400);
    expect((await handleRequest(createRequest({ dateKey: "2026-08-01", event: "daily-ready", text: "自定义消息" }), env, now, feishu)).status).toBe(400);
    expect(feishu).not.toHaveBeenCalled();
  });

  it("sends the fixed message and records the date after Feishu accepts it", async () => {
    const feishu = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ StatusCode: 0 }), { status: 200 }));
    const env = createEnv();

    const response = await handleRequest(createRequest({ dateKey: "2026-08-01", event: "daily-ready" }), env, now, feishu);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent" });
    expect(feishu).toHaveBeenCalledWith(env.FEISHU_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ msg_type: "text", content: { text: "任务已完成" } }),
    });
    expect(await env.NOTIFICATION_STATE.get("daily-ready:2026-08-01")).toBe(now.toISOString());
  });

  it("returns success without sending again when the date is already recorded", async () => {
    const feishu = vi.fn<typeof fetch>();
    const env = createEnv();
    await env.NOTIFICATION_STATE.put("daily-ready:2026-08-01", now.toISOString());

    const response = await handleRequest(createRequest({ dateKey: "2026-08-01", event: "daily-ready" }), env, now, feishu);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "already-sent" });
    expect(feishu).not.toHaveBeenCalled();
  });

  it("does not mark the date when Feishu rejects the notification", async () => {
    const feishu = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ code: 19024 }), { status: 200 }));
    const env = createEnv();

    const response = await handleRequest(createRequest({ dateKey: "2026-08-01", event: "daily-ready" }), env, now, feishu);

    expect(response.status).toBe(502);
    expect(await env.NOTIFICATION_STATE.get("daily-ready:2026-08-01")).toBeNull();
  });

  it("answers valid CORS preflight requests", async () => {
    const request = new Request(endpoint, { method: "OPTIONS", headers: { "Origin": origin } });
    const response = await handleRequest(request, createEnv(), now);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });
});
