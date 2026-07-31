import { describe, expect, it } from "vitest";
import { gameQuestionBanks, getDailyTaskIds, sectionMeta, taskCatalog, weeklyContent } from "../appData";
import { generateArithmetic } from "../App";
import {
  adjustPoints,
  approveReward,
  calculateStreak,
  completeTask,
  DEFAULT_PARENT_PIN,
  fulfillReward,
  initialWorkspaceState,
  migrateLegacyState,
  refreshDailyState,
  requestReward,
  updateParentPin,
} from "./workspace";

const day = (value: string) => new Date(`${value}T12:00:00`);

describe("daily task planning", () => {
  it("generates a stable six-task plan from Monday to Saturday", () => {
    const monday = day("2026-08-03");
    const first = getDailyTaskIds(monday);
    const second = getDailyTaskIds(monday);

    expect(first).toEqual(second);
    expect(first).toHaveLength(6);
    expect(first).toEqual(expect.arrayContaining([
      "chinese-morning-reading",
      "math-arithmetic",
      "english-daily",
      "chinese-night-reading",
    ]));
  });

  it("uses a lighter Sunday plan and rotates specialist tasks without repeating in a week", () => {
    const sunday = getDailyTaskIds(day("2026-08-02"));
    expect(sunday).toHaveLength(4);
    expect(sunday).not.toContain("math-arithmetic");

    const rotating = Array.from({ length: 6 }, (_, offset) => {
      const value = day("2026-08-03");
      value.setDate(value.getDate() + offset);
      return getDailyTaskIds(value).find((id) => taskCatalog.find((task) => task.id === id)?.schedule === "rotation");
    });
    expect(new Set(rotating).size).toBe(6);
  });
});

describe("workspace state", () => {
  it("awards each task once and adds the 15-point full-day bonus once", () => {
    const today = day("2026-07-31");
    const initial = initialWorkspaceState(today);
    const first = completeTask(initial, "a", 5, ["a", "b"], { score: 80 }, today);
    const duplicate = completeTask(first, "a", 5, ["a", "b"], { score: 100 }, today);
    const finished = completeTask(duplicate, "b", 6, ["a", "b"], { durationSeconds: 900 }, today);

    expect(duplicate.points).toBe(5);
    expect(duplicate.taskResults).toHaveLength(1);
    expect(finished.points).toBe(26);
    expect(finished.completedDates).toEqual(["2026-07-31"]);
    expect(finished.weeklyPoints["2026-07-27"]).toBe(26);
  });

  it("stores score, duration, attempts, wrong questions and completion time", () => {
    const today = day("2026-07-31");
    const completed = completeTask(initialWorkspaceState(today), "math-arithmetic", 5, ["math-arithmetic"], {
      score: 85,
      durationSeconds: 420,
      attempts: 2,
      wrongQuestions: ["36 + 17 ="],
    }, today);

    expect(completed.taskResults[0]).toMatchObject({
      taskId: "math-arithmetic",
      dateKey: "2026-07-31",
      score: 85,
      durationSeconds: 420,
      attempts: 2,
      wrongQuestions: ["36 + 17 ="],
      completedAt: today.toISOString(),
    });
  });

  it("resets daily tasks while preserving lifetime points and history", () => {
    const yesterday = day("2026-07-30");
    const completed = completeTask(initialWorkspaceState(yesterday), "a", 5, ["a"], {}, yesterday);
    const refreshed = refreshDailyState(completed, day("2026-07-31"));

    expect(refreshed.points).toBe(20);
    expect(refreshed.completedTaskIds).toEqual([]);
    expect(refreshed.completedDates).toEqual(["2026-07-30"]);
    expect(refreshed.taskResults).toHaveLength(1);
  });

  it("migrates v1 points, check-in history and redemption records", () => {
    const migrated = migrateLegacyState({
      dateKey: "2026-07-30",
      points: 123,
      completedTaskIds: ["math-arithmetic"],
      bonusAwarded: true,
      completedDates: ["2026-07-29", "2026-07-30"],
      redemptions: [{
        id: "old-redemption",
        rewardId: "reward-snack",
        rewardName: "零食",
        cost: 25,
        redeemedAt: "2026-07-25T04:00:00.000Z",
      }],
    }, day("2026-07-31"));

    expect(migrated.points).toBe(123);
    expect(migrated.completedTaskIds).toEqual([]);
    expect(migrated.completedDates).toEqual(["2026-07-29", "2026-07-30"]);
    expect(migrated.rewardRequests[0]).toMatchObject({ status: "fulfilled", rewardName: "零食" });
  });

  it("calculates a streak from today or yesterday", () => {
    const dates = ["2026-07-28", "2026-07-29", "2026-07-30"];
    expect(calculateStreak(dates, day("2026-07-31"))).toBe(3);
  });
});

describe("parent approval and rewards", () => {
  it("opens requests only on weekends and requires the parent PIN for approval", () => {
    const state = { ...initialWorkspaceState(day("2026-08-01")), points: 120 };
    const reward = { id: "reward-snack", name: "零食", cost: 80 };

    expect(requestReward(state, reward, day("2026-07-31"))).toBeNull();
    const requested = requestReward(state, reward, day("2026-08-01"));
    expect(requested?.points).toBe(120);
    expect(requested?.rewardRequests[0].status).toBe("pending");
    expect(approveReward(requested!, requested!.rewardRequests[0].id, "0000", day("2026-08-01"))).toBeNull();
  });

  it("deducts points once on approval and records fulfillment", () => {
    const state = { ...initialWorkspaceState(day("2026-08-01")), points: 120 };
    const requested = requestReward(state, { id: "reward-snack", name: "零食", cost: 80 }, day("2026-08-01"))!;
    const requestId = requested.rewardRequests[0].id;
    const approved = approveReward(requested, requestId, DEFAULT_PARENT_PIN, day("2026-08-01"))!;

    expect(approved.points).toBe(40);
    expect(approveReward(approved, requestId, DEFAULT_PARENT_PIN, day("2026-08-01"))).toBeNull();
    const fulfilled = fulfillReward(approved, requestId, DEFAULT_PARENT_PIN, day("2026-08-02"))!;
    expect(fulfilled.points).toBe(40);
    expect(fulfilled.rewardRequests[0].status).toBe("fulfilled");
    expect(fulfilled.rewardRequests[0].fulfilledAt).toBe(day("2026-08-02").toISOString());
  });

  it("updates the four-digit PIN and protects manual point adjustments", () => {
    const state = { ...initialWorkspaceState(), points: 10 };
    expect(updateParentPin(state, "0000", "1234")).toBeNull();
    expect(updateParentPin(state, DEFAULT_PARENT_PIN, "123")).toBeNull();
    const updated = updateParentPin(state, DEFAULT_PARENT_PIN, "1234")!;
    expect(adjustPoints(updated, 10, DEFAULT_PARENT_PIN)).toBeNull();
    expect(adjustPoints(updated, -50, "1234")?.points).toBe(0);
  });
});

describe("practice content safeguards", () => {
  it("generates only positive-integer arithmetic within 100", () => {
    const questions = generateArithmetic("2026-07-31", 1000);

    expect(questions).toHaveLength(1000);
    for (const question of questions) {
      expect(Number.isInteger(question.answer)).toBe(true);
      expect(question.answer).toBeGreaterThan(0);
      expect(question.answer).toBeLessThanOrEqual(100);
      expect(question.prompt).not.toMatch(/[.-]\d*\./);
    }
  });

  it("provides at least 20 questions in every game bank", () => {
    for (const bank of Object.values(gameQuestionBanks)) expect(bank.length).toBeGreaterThanOrEqual(20);
  });

  it("provides eight complete Yilin Grade 2A English units", () => {
    expect(weeklyContent).toHaveLength(8);
    expect(new Set(weeklyContent.map((content) => content.english.unit)).size).toBe(8);
    for (const content of weeklyContent) {
      expect(content.english.words.length).toBeGreaterThanOrEqual(4);
      expect(content.english.patterns.length).toBeGreaterThanOrEqual(2);
      expect(content.english.tasks.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses a different character icon for every navigation item", () => {
    const icons = Object.values(sectionMeta).map((item) => item.navIcon);
    expect(icons).toHaveLength(7);
    expect(new Set(icons).size).toBe(7);
  });
});
