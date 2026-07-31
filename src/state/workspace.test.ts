import { describe, expect, it } from "vitest";
import { gameQuestionBanks, getDailyTaskIds, getGameChallenges, getStudySchedule, sectionMeta, taskCatalog, weeklyContent, wordProblems } from "../appData";
import { generateArithmetic } from "../App";
import {
  adjustPoints,
  approveAllTaskReviews,
  approveReward,
  approveTaskReview,
  calculateStreak,
  completeTask,
  dailyParentPin,
  fulfillReward,
  getDailyReport,
  getMonthlyReport,
  getWeeklyReport,
  initialWorkspaceState,
  migrateLegacyState,
  refreshDailyState,
  rejectTaskReview,
  requestReward,
  submitTaskReview,
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

  it("uses a lighter Sunday plan and follows the fixed August study schedule", () => {
    const sunday = getDailyTaskIds(day("2026-08-02"));
    expect(sunday).toHaveLength(4);
    expect(sunday).not.toContain("math-arithmetic");

    expect(getDailyTaskIds(day("2026-08-03"))).toContain("chinese-reading-comprehension");
    expect(getDailyTaskIds(day("2026-08-04"))).toContain("chinese-memorize");
    expect(getDailyTaskIds(day("2026-08-05"))).toContain("chinese-preview-copybook");
  });

  it("covers all eight August units and ends with a September 1 review", () => {
    const starts = [1, 5, 9, 13, 17, 21, 25, 28];
    starts.forEach((date, unitIndex) => {
      const schedule = getStudySchedule(day(`2026-08-${String(date).padStart(2, "0")}`));
      expect(schedule.unitIndex).toBe(unitIndex);
      expect(schedule.dayInUnit).toBe(0);
      expect(schedule.isSummerPlan).toBe(true);
    });
    expect(getStudySchedule(day("2026-08-31"))).toMatchObject({ unitIndex: 7, stageLabel: "小复习闯关", daysUntilSchool: 1 });
    expect(getStudySchedule(day("2026-09-01"))).toMatchObject({ unitIndex: 7, stageLabel: "开学回顾", daysUntilSchool: 0 });
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
    expect(finished.dailyEarnedPoints["2026-07-31"]).toBe(26);
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
    expect(refreshed.dailyEarnedPoints["2026-07-30"]).toBe(20);
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

  it("summarizes daily, weekly, and monthly learning records", () => {
    const augustFirst = day("2026-08-01");
    const firstDay = completeTask(initialWorkspaceState(augustFirst), "math-arithmetic", 5, ["math-arithmetic"], { score: 80, durationSeconds: 300, wrongQuestions: ["36 + 17 ="] }, augustFirst);
    const augustSecond = day("2026-08-02");
    const secondDay = completeTask(firstDay, "math-arithmetic", 5, ["math-arithmetic"], { score: 100, durationSeconds: 240 }, augustSecond);

    expect(getDailyReport(secondDay, augustSecond)).toMatchObject({ taskCount: 1, completedDays: 1, earnedPoints: 20, arithmeticAverage: 100 });
    expect(getWeeklyReport(secondDay, augustSecond)).toMatchObject({ taskCount: 2, completedDays: 2, earnedPoints: 40, arithmeticAverage: 90 });
    expect(getMonthlyReport(secondDay, augustSecond)).toMatchObject({ taskCount: 2, completedDays: 2, earnedPoints: 40, arithmeticAverage: 90 });
    expect(getMonthlyReport(secondDay, augustSecond).wrongQuestions).toEqual(["36 + 17 ="]);
  });
});

describe("parent approval and rewards", () => {
  it("queues subjective work without points and awards it once after approval", () => {
    const today = day("2026-08-01");
    const state = initialWorkspaceState(today);
    const task = { id: "chinese-morning-reading", title: "每日晨读", points: 5 };
    const submitted = submitTaskReview(state, task, { durationSeconds: 600, evidence: "有效计时10分钟" }, today);
    const duplicate = submitTaskReview(submitted, task, { durationSeconds: 900 }, today);

    expect(submitted.points).toBe(0);
    expect(duplicate.pendingTaskReviews).toHaveLength(1);
    expect(approveTaskReview(duplicate, duplicate.pendingTaskReviews[0].id, [task.id], "0000", today)).toBeNull();

    const approved = approveTaskReview(duplicate, duplicate.pendingTaskReviews[0].id, [task.id], dailyParentPin(today), today)!;
    expect(approved.pendingTaskReviews).toHaveLength(0);
    expect(approved.completedTaskIds).toEqual([task.id]);
    expect(approved.points).toBe(20);
    expect(approved.taskResults[0].evidence).toBe("有效计时10分钟");
    expect(approveTaskReview(approved, duplicate.pendingTaskReviews[0].id, [task.id], dailyParentPin(today), today)).toBeNull();
  });

  it("batch approves today's queue, supports rejection, and expires unreviewed work at midnight", () => {
    const today = day("2026-08-01");
    const initial = completeTask(initialWorkspaceState(today), "math-arithmetic", 5, ["math-arithmetic", "english-daily", "sport-hour"], { score: 90 }, today);
    const withEnglish = submitTaskReview(initial, { id: "english-daily", title: "英语每日听读任务", points: 6 }, { durationSeconds: 900 }, today);
    const queued = submitTaskReview(withEnglish, { id: "sport-hour", title: "每日运动总目标", points: 6 }, { evidence: "填写完成60分钟" }, today);
    const rejected = rejectTaskReview(queued, queued.pendingTaskReviews[1].id, dailyParentPin(today), today)!;
    expect(rejected.pendingTaskReviews).toHaveLength(1);

    const resubmitted = submitTaskReview(rejected, { id: "sport-hour", title: "每日运动总目标", points: 6 }, { evidence: "填写完成60分钟" }, today);
    const approved = approveAllTaskReviews(resubmitted, ["math-arithmetic", "english-daily", "sport-hour"], dailyParentPin(today), today)!;
    expect(approved.pendingTaskReviews).toHaveLength(0);
    expect(approved.points).toBe(32);
    expect(approved.dailyEarnedPoints["2026-08-01"]).toBe(32);
    expect(approved.bonusAwarded).toBe(true);
    expect(approveAllTaskReviews(approved, ["math-arithmetic", "english-daily", "sport-hour"], dailyParentPin(today), today)?.points).toBe(32);

    const pendingNextDay = submitTaskReview(initialWorkspaceState(today), { id: "english-daily", title: "英语每日听读任务", points: 6 }, { durationSeconds: 900 }, today);
    expect(refreshDailyState(pendingNextDay, day("2026-08-02")).pendingTaskReviews).toHaveLength(0);
  });

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
    const approved = approveReward(requested, requestId, "0801", day("2026-08-01"))!;

    expect(approved.points).toBe(40);
    expect(approveReward(approved, requestId, "0801", day("2026-08-01"))).toBeNull();
    expect(fulfillReward(approved, requestId, "0801", day("2026-08-02"))).toBeNull();
    const fulfilled = fulfillReward(approved, requestId, "0802", day("2026-08-02"))!;
    expect(fulfilled.points).toBe(40);
    expect(fulfilled.rewardRequests[0].status).toBe("fulfilled");
    expect(fulfilled.rewardRequests[0].fulfilledAt).toBe(day("2026-08-02").toISOString());
  });

  it("uses the current month and day as the PIN for protected adjustments", () => {
    const state = { ...initialWorkspaceState(), points: 10 };
    const augustFirst = day("2026-08-01");
    expect(dailyParentPin(augustFirst)).toBe("0801");
    expect(dailyParentPin(day("2026-12-09"))).toBe("1209");
    expect(adjustPoints(state, 10, "2580", augustFirst)).toBeNull();
    expect(adjustPoints(state, -50, "0801", augustFirst)?.points).toBe(0);
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

  it("provides 40 questions in every game bank with deterministic five-round sessions", () => {
    for (const [taskId, bank] of Object.entries(gameQuestionBanks)) {
      expect(bank.length).toBeGreaterThanOrEqual(40);
      const first = getGameChallenges(taskId, day("2026-08-03"));
      expect(first).toEqual(getGameChallenges(taskId, day("2026-08-03")));
      expect(first).toHaveLength(5);
      expect(new Set(first.map((item) => item.question)).size).toBe(5);

      const weekQuestions = Array.from({ length: 7 }, (_, offset) => {
        const value = day("2026-08-03");
        value.setDate(value.getDate() + offset);
        return getGameChallenges(taskId, value);
      }).flat();
      expect(new Set(weekQuestions.map((item) => item.question)).size).toBe(35);
    }
  });

  it("sets every game to an 80 percent pass score", () => {
    const games = taskCatalog.filter((task) => task.category === "game");
    expect(games).toHaveLength(4);
    for (const game of games) expect(game.minimumScore).toBe(80);
  });

  it("provides 40 age-appropriate integer word problems", () => {
    expect(wordProblems).toHaveLength(40);
    for (const problem of wordProblems) {
      const answer = Number(problem.answer.match(/^\d+/)?.[0]);
      expect(Number.isInteger(answer)).toBe(true);
      expect(answer).toBeGreaterThan(0);
      expect(answer).toBeLessThanOrEqual(100);
    }
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

  it("provides seven unique short labels for mobile navigation", () => {
    const labels = Object.values(sectionMeta).map((item) => item.mobileLabel);
    expect(labels).toEqual(["首页", "语文", "数学", "英语", "游戏", "运动", "商店"]);
    expect(new Set(labels).size).toBe(7);
  });
});
