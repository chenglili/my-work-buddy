import { describe, expect, it, vi } from "vitest";
import { sendDailyReadyNotification } from "./dailyNotification";

describe("daily-ready notification client", () => {
  it("does nothing when the Worker endpoint is not configured", async () => {
    const request = vi.fn<typeof fetch>();

    await expect(sendDailyReadyNotification("2026-08-01", "", request)).resolves.toBe("disabled");
    expect(request).not.toHaveBeenCalled();
  });

  it("sends only the date and fixed event type", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));

    await expect(sendDailyReadyNotification("2026-08-01", "https://notify.example/daily", request)).resolves.toBe("sent");
    expect(request).toHaveBeenCalledWith("https://notify.example/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey: "2026-08-01", event: "daily-ready" }),
    });
  });

  it("keeps the notification eligible for retry after network or server errors", async () => {
    const networkFailure = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    const serverFailure = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 502 }));

    await expect(sendDailyReadyNotification("2026-08-01", "https://notify.example/daily", networkFailure)).resolves.toBe("failed");
    await expect(sendDailyReadyNotification("2026-08-01", "https://notify.example/daily", serverFailure)).resolves.toBe("failed");
  });
});
