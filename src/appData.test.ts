import { describe, expect, it } from "vitest";
import { getNightReading, taskCatalog } from "./appData";
import { extendedReadingComprehensions } from "./data";

const task = (id: string) => taskCatalog.find((item) => item.id === id);

it("describes multiplication match as expression-to-answer pairing", () => {
  expect(task("game-spot")?.summary).toContain("对应答案数字");
  expect(task("game-spot")?.summary).not.toContain("相邻且积相同");
});

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

  it("keeps comprehension passages in the 600-800 character range", () => {
    for (const item of extendedReadingComprehensions) {
      const length = item.paragraphs.join("").length;
      expect(length, item.id).toBeGreaterThanOrEqual(600);
      expect(length, item.id).toBeLessThanOrEqual(800);
    }
  });
});
