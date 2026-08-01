import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://chenglili.github.io",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (origin: string, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
});

const feishuAccepted = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const body = value as { code?: unknown; StatusCode?: unknown };
  return body.code === 0 || body.StatusCode === 0;
};

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") ?? "";
  if (!allowedOrigins.has(origin)) return new Response("origin not allowed", { status: 403 });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return json(origin, { error: "method-not-allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json(origin, { error: "authentication-required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const webhookUrl = Deno.env.get("FEISHU_WEBHOOK_URL") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !webhookUrl) return json(origin, { error: "service-not-configured" }, 503);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json(origin, { error: "invalid-session" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claim, error: claimError } = await admin.rpc("claim_daily_notification_for_user", { p_user_id: userData.user.id });
  if (claimError) return json(origin, { error: "notification-check-failed" }, 500);
  if (!claim?.claimed) return json(origin, { status: "not-ready-or-sent" });

  const finish = (success: boolean, error?: string) => admin.rpc("finish_daily_notification", {
    p_child_id: claim.childId,
    p_date_key: claim.dateKey,
    p_success: success,
    p_error: error ?? null,
  });

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ msg_type: "text", content: { text: "任务已完成" } }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !feishuAccepted(body)) {
      await finish(false, "Feishu rejected the notification");
      return json(origin, { error: "notification-rejected" }, 502);
    }
    await finish(true);
    return json(origin, { status: "sent" });
  } catch {
    await finish(false, "Feishu was unavailable");
    return json(origin, { error: "notification-unavailable" }, 502);
  }
});
