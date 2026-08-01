export type DailyNotificationResult = "sent" | "disabled" | "failed";

export const sendDailyReadyNotification = async (
  dateKey: string,
  endpoint = import.meta.env.VITE_FEISHU_NOTIFY_URL?.trim(),
  request: typeof fetch = fetch,
): Promise<DailyNotificationResult> => {
  if (!endpoint) return "disabled";

  try {
    const response = await request(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey, event: "daily-ready" }),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
};
