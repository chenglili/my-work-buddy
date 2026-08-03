import { describe, expect, it } from "vitest";
import { getNightReading, taskCatalog } from "./appData";

const task = (id: string) => taskCatalog.find((item) => item.id === id);

describe("reading completion rules", () => {
  it("allows subject reading tasks to be completed without a timer", () => {
    for (const id of ["chinese-morning-reading", "chinese-night-reading", "english-daily"]) {
      expect(task(id)).toMatchObject({ completionMode: "auto", minimumScore: 0 });
      expect(task(id)?.minimumDuration).toBeUndefined();
    }
  });

  it("keeps the English daily reading copy readable", () => {
    expect(task("english-daily")).toMatchObject({
      title: "英语每日听读任务",
      minutes: "自主安排",
      summary: "译林版二年级上册主题听读，包含单词、核心句型和跟读任务。",
    });
  });

  it("provides longer age-appropriate passages for night reading", () => {
    expect(getNightReading(new Date("2026-08-03T12:00:00")).text.length).toBeGreaterThan(300);
  });
});
