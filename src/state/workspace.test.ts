import { describe, expect, it } from "vitest";
import { gameQuestionBanks, getDailyTaskIds, getGameChallenges, getStudySchedule, getWeeklyContent, sectionMeta, taskCatalog, weeklyContent, wordProblemAnswerMatches, wordProblems } from "../appData";
import { allowsDirectCompletion, completedTaskIdsForToday, generateArithmetic, isMultiplicationMatch, petHotspotIsAvailable, petSceneHotspots } from "../App";
import {
  adjustPoints,
  advanceContentRound,
  approveAllTaskReviews,
  approveReward,
  approveTaskReview,
  calculateStreak,
  cancelReward,
  completeTask,
  dailyParentPin,
  fulfillReward,
  getDailyReport,
  getMonthlyReport,
  getWeeklyReport,
  initialWorkspaceState,
  isDailyReadyForNotification,
  markDailyReadyNotified,
  migrateLegacyState,
  normalizeWorkspaceState,
  interactWithPet,
  petItemDefinitions,
  purchasePetItem,
  refreshDailyState,
  refreshPetState,
  rejectReward,
  rejectTaskReview,
  requestReward,
  resetTodayGameCompletions,
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

    const secondDay = getDailyTaskIds(day("2026-08-02"), { previousDayCompleted: true });
    expect(secondDay).toHaveLength(6);
    expect(secondDay).toEqual(expect.arrayContaining(["math-arithmetic", "chinese-dictation"]));

    expect(getDailyTaskIds(day("2026-08-03"))).toContain("chinese-reading-comprehension");
    expect(getDailyTaskIds(day("2026-08-04"))).toContain("chinese-memorize");
    expect(getDailyTaskIds(day("2026-08-05"))).toContain("chinese-preview-copybook");
  });

  it("changes subject focus on the second day of a summer unit", () => {
    const firstDay = getWeeklyContent(day("2026-08-01"));
    const secondDay = getWeeklyContent(day("2026-08-02"));

    expect(secondDay.readingTitle).toContain("听读与理解");
    expect(secondDay.words).not.toEqual(firstDay.words);
    expect(secondDay.dictation).not.toEqual(firstDay.dictation);
    expect(secondDay.english.title).toContain("听读与理解");
    expect(secondDay.english.words).not.toEqual(firstDay.english.words);
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

  it("generates new arithmetic prompts without mastered prompts", () => {
    const first = generateArithmetic("round-a", 20);
    const next = generateArithmetic("round-b", 20, first.map((item) => item.prompt));
    expect(next).toHaveLength(20);
    expect(next.map((item) => item.prompt)).not.toEqual(expect.arrayContaining(first.map((item) => item.prompt)));
  });

  it("switches to deterministic random unit review content after the summer units", () => {
    const review = getWeeklyContent(day("2026-09-01"));
    expect(getStudySchedule(day("2026-09-01"))).toMatchObject({ isUnitTest: true });
    expect(review.theme).toBe("随机单元测试");
  });

  it("skips mastered game questions while the bank still has fresh questions", () => {
    const first = getGameChallenges("game-number", day("2026-08-01"), 5);
    const next = getGameChallenges("game-number", day("2026-08-02"), 5, first.map((item) => item.question));
    expect(next).toHaveLength(5);
    expect(next.map((item) => item.question)).not.toEqual(expect.arrayContaining(first.map((item) => item.question)));
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
    expect(finished.pointRecords.map((record) => ({ delta: record.delta, reason: record.reason }))).toEqual([
      { delta: 6, reason: "task" },
      { delta: 15, reason: "daily_bonus" },
      { delta: 5, reason: "task" },
    ]);
  });

  it("awards the same task again only after a new content round", () => {
    const today = day("2026-08-01");
    const first = completeTask(initialWorkspaceState(today), "math-arithmetic", 5, ["math-arithmetic"], { score: 100 }, today);
    const duplicate = completeTask(first, "math-arithmetic", 5, ["math-arithmetic"], { score: 100 }, today);
    const nextRound = advanceContentRound(first, "2026-08-02", today);
    const second = completeTask(nextRound, "math-arithmetic", 5, ["math-arithmetic"], { score: 100 }, today);

    expect(duplicate.points).toBe(first.points);
    expect(second.points).toBe(first.points + 5);
    expect(second.contentRound).toBe(1);
    expect(second.taskResults).toHaveLength(2);
  });

  it("stores score, duration, attempts, wrong questions and completion time", () => {
    const today = day("2026-07-31");
    const completed = completeTask(initialWorkspaceState(today), "math-arithmetic", 5, ["math-arithmetic"], {
      score: 85,
      durationSeconds: 420,
      attempts: 2,
      wrongQuestions: ["36 + 17 ="],
      answers: { "0": "53", "1": "42" },
    }, today);

    expect(completed.taskResults[0]).toMatchObject({
      taskId: "math-arithmetic",
      dateKey: "2026-07-31",
      score: 85,
      durationSeconds: 420,
      attempts: 2,
      wrongQuestions: ["36 + 17 ="],
      answers: { "0": "53", "1": "42" },
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

  it("recognizes a daily plan when every required task is completed or waiting for review", () => {
    const today = day("2026-08-01");
    const requiredTaskIds = ["math-arithmetic", "english-daily", "sport-hour"];
    const completed = completeTask(initialWorkspaceState(today), "math-arithmetic", 5, requiredTaskIds, { score: 90 }, today);
    const withEnglish = submitTaskReview(completed, { id: "english-daily", title: "英语每日听读任务", points: 6 }, {}, today);

    expect(isDailyReadyForNotification(withEnglish, requiredTaskIds)).toBe(false);

    const ready = submitTaskReview(withEnglish, { id: "sport-hour", title: "每日运动总目标", points: 6 }, {}, today);
    expect(isDailyReadyForNotification(ready, requiredTaskIds)).toBe(true);
    expect(isDailyReadyForNotification(ready, [])).toBe(false);
  });

  it("records each daily-ready notification once and preserves it after midnight", () => {
    const today = day("2026-08-01");
    const initial = initialWorkspaceState(today);
    const notified = markDailyReadyNotified(initial);
    const duplicate = markDailyReadyNotified(notified);
    const refreshed = refreshDailyState(duplicate, day("2026-08-02"));

    expect(duplicate.notifiedDailyReadyDates).toEqual(["2026-08-01"]);
    expect(refreshed.notifiedDailyReadyDates).toEqual(["2026-08-01"]);
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
    expect(migrated.notifiedDailyReadyDates).toEqual([]);
  });

  it("calculates a streak from today or yesterday", () => {
    const dates = ["2026-07-28", "2026-07-29", "2026-07-30"];
    expect(calculateStreak(dates, day("2026-07-31"))).toBe(3);
  });

  it("uses retained daily points when completed-date history is missing", () => {
    expect(calculateStreak([], day("2026-08-03"), {
      "2026-08-01": 20,
      "2026-08-02": 20,
    })).toBe(2);
  });

  it("summarizes daily, weekly, and monthly learning records", () => {
    const augustFirst = day("2026-08-01");
    const firstDay = completeTask(initialWorkspaceState(augustFirst), "math-arithmetic", 5, ["math-arithmetic"], { score: 100, firstScore: 80, durationSeconds: 300, wrongQuestions: ["36 + 17 ="] }, augustFirst);
    const augustSecond = day("2026-08-02");
    const secondDay = completeTask(firstDay, "math-arithmetic", 5, ["math-arithmetic"], { score: 100, firstScore: 90, durationSeconds: 240 }, augustSecond);

    expect(getDailyReport(secondDay, augustSecond)).toMatchObject({ taskCount: 1, completedDays: 1, earnedPoints: 20, arithmeticAverage: 90 });
    expect(getWeeklyReport(secondDay, augustSecond)).toMatchObject({ taskCount: 2, completedDays: 2, earnedPoints: 40, arithmeticAverage: 85 });
    expect(getMonthlyReport(secondDay, augustSecond)).toMatchObject({ taskCount: 2, completedDays: 2, earnedPoints: 40, arithmeticAverage: 85 });
    expect(getMonthlyReport(secondDay, augustSecond).wrongQuestions).toEqual(["36 + 17 ="]);
  });

  it("counts full check-in days from daily bonus records when date history is missing", () => {
    const today = day("2026-08-03");
    const state = {
      ...initialWorkspaceState(today),
      completedDates: [],
      pointRecords: [{
        id: "bonus-2026-08-03",
        dateKey: "2026-08-03",
        delta: 15,
        reason: "daily_bonus" as const,
        sourceKey: "daily-bonus:2026-08-03",
        createdAt: "2026-08-03T12:00:00.000Z",
      }],
    };

    expect(getDailyReport(state, today).completedDays).toBe(1);
    expect(getWeeklyReport(state, today).completedDays).toBe(1);
    expect(getMonthlyReport(state, today).completedDays).toBe(1);
  });
});

describe("pet care", () => {
  it("keeps daily care affordable while preserving a weekly real-reward goal", () => {
    const monday = day("2026-08-03");
    const sunday = day("2026-08-09");
    const pointsFor = (date: Date) => getDailyTaskIds(date)
      .map((taskId) => taskCatalog.find((task) => task.id === taskId)!.points)
      .reduce((total, points) => total + points, 15);
    const food = petItemDefinitions.find((item) => item.id === "parrot-food")!;
    const spray = petItemDefinitions.find((item) => item.id === "bath-spray")!;
    const bell = petItemDefinitions.find((item) => item.id === "bell-toy")!;
    const weeklyBaseline = (pointsFor(monday) * 6) + pointsFor(sunday);
    const weeklyCareBudget = (food.price * 7) + (spray.price * 4);

    expect(pointsFor(monday)).toBe(47);
    expect(pointsFor(sunday)).toBe(37);
    expect(food.price).toBe(3);
    expect(spray.price).toBe(4);
    expect(bell.price).toBe(20);
    expect(petItemDefinitions.find((item) => item.id === "apple-bites")!.price).toBe(4);
    expect(bell.price).toBeLessThanOrEqual(pointsFor(monday));
    expect(weeklyBaseline - weeklyCareBudget).toBeGreaterThanOrEqual(250);
  });

  it("uses 嘟嘟 as the pet name and migrates the previous default", () => {
    const today = day("2026-08-01");
    const state = initialWorkspaceState(today);
    const normalized = normalizeWorkspaceState({ ...state, pet: { ...state.pet, name: "啾啾" } }, today);

    expect(state.pet.name).toBe("嘟嘟");
    expect(normalized.pet.name).toBe("嘟嘟");
  });

  it("maps the four pet-house hotspots to the existing pet actions", () => {
    expect(petSceneHotspots.map(({ id, action, itemId }) => ({ id, action, itemId }))).toEqual([
      { id: "food", action: "feed", itemId: "parrot-food" },
      { id: "apple", action: "feed", itemId: "apple-bites" },
      { id: "bell", action: "play", itemId: "bell-toy" },
      { id: "bath", action: "bathe", itemId: "bath-spray" },
    ]);
  });

  it("only enables a hotspot when its inventory or toy ownership is ready", () => {
    const state = initialWorkspaceState(day("2026-08-01"));
    expect(petHotspotIsAvailable(state.pet, "parrot-food")).toBe(false);
    expect(petHotspotIsAvailable(state.pet, "bell-toy")).toBe(false);

    const readyPet = {
      ...state.pet,
      inventory: { "parrot-food": 1, "apple-bites": 1, "bath-spray": 1 },
      ownedToys: ["bell-toy" as const],
    };
    expect(petHotspotIsAvailable(readyPet, "parrot-food")).toBe(true);
    expect(petHotspotIsAvailable(readyPet, "apple-bites")).toBe(true);
    expect(petHotspotIsAvailable(readyPet, "bath-spray")).toBe(true);
    expect(petHotspotIsAvailable(readyPet, "bell-toy")).toBe(true);
  });

  it("buys consumables immediately and rejects a purchase without enough points", () => {
    const today = day("2026-08-01");
    const funded = { ...initialWorkspaceState(today), points: 20 };
    const purchased = purchasePetItem(funded, "parrot-food", today)!;

    expect(purchased.points).toBe(17);
    expect(purchased.pet.inventory["parrot-food"]).toBe(1);
    expect(purchasePetItem(purchased, "apple-bites", today)).not.toBeNull();
    expect(purchasePetItem({ ...funded, points: 2 }, "parrot-food", today)).toBeNull();
  });

  it("unlocks the bell permanently and allows it to be purchased only once", () => {
    const today = day("2026-08-01");
    const funded = { ...initialWorkspaceState(today), points: 80 };
    const purchased = purchasePetItem(funded, "bell-toy", today)!;

    expect(purchased.points).toBe(60);
    expect(purchased.pet.ownedToys).toEqual(["bell-toy"]);
    expect(purchasePetItem(purchased, "bell-toy", today)).toBeNull();
  });

  it("consumes food and bath supplies while keeping the toy", () => {
    const today = day("2026-08-01");
    const funded = { ...initialWorkspaceState(today), points: 100 };
    const withFood = purchasePetItem(funded, "parrot-food", today)!;
    const fed = interactWithPet(withFood, "feed", "parrot-food", today)!;
    const withSpray = purchasePetItem(fed, "bath-spray", today)!;
    const bathed = interactWithPet(withSpray, "bathe", "bath-spray", today)!;
    const withToy = purchasePetItem(bathed, "bell-toy", today)!;
    const played = interactWithPet(withToy, "play", "bell-toy", today)!;

    expect(fed.pet.inventory["parrot-food"]).toBe(0);
    expect(fed.pet.satiety).toBe(86);
    expect(bathed.pet.inventory["bath-spray"]).toBe(0);
    expect(bathed.pet.cleanliness).toBe(94);
    expect(played.pet.ownedToys).toContain("bell-toy");
    expect(played.pet.happiness).toBe(93);
    expect(interactWithPet(funded, "feed", "parrot-food", today)).toBeNull();
    expect(interactWithPet(funded, "play", "bell-toy", today)).toBeNull();
  });

  it("decreases pet status only once on each crossed date", () => {
    const firstDay = day("2026-08-01");
    const secondDay = day("2026-08-02");
    const state = initialWorkspaceState(firstDay);
    const refreshed = refreshPetState(state, secondDay);
    const duplicate = refreshPetState(refreshed, secondDay);

    expect(refreshed.pet).toMatchObject({ satiety: 62, happiness: 71, cleanliness: 76, lastRefreshedDate: "2026-08-02" });
    expect(duplicate).toBe(refreshed);
    expect(refreshPetState(duplicate, day("2026-08-03")).pet.satiety).toBe(52);
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
    expect(approved.pointRecords[0]).toMatchObject({ delta: -80, reason: "reward", sourceId: "reward-snack" });
    expect(approveReward(approved, requestId, "0801", day("2026-08-01"))).toBeNull();
    expect(fulfillReward(approved, requestId, "0801", day("2026-08-02"))).toBeNull();
    const fulfilled = fulfillReward(approved, requestId, "0802", day("2026-08-02"))!;
    expect(fulfilled.points).toBe(40);
    expect(fulfilled.rewardRequests[0].status).toBe("fulfilled");
    expect(fulfilled.rewardRequests[0].fulfilledAt).toBe(day("2026-08-02").toISOString());
  });

  it("lets a pending request be cancelled and requested again without changing points", () => {
    const today = day("2026-08-01");
    const state = { ...initialWorkspaceState(today), points: 120 };
    const reward = { id: "reward-snack", name: "零食", cost: 80 };
    const requested = requestReward(state, reward, today)!;
    const cancelled = cancelReward(requested, requested.rewardRequests[0].id, today)!;

    expect(cancelled.points).toBe(120);
    expect(cancelled.rewardRequests[0].status).toBe("cancelled");
    expect(cancelled.rewardRequests[0].cancelledAt).toBe(today.toISOString());
    expect(cancelReward(cancelled, cancelled.rewardRequests[0].id, today)).toBeNull();

    const later = new Date(today.getTime() + 60_000);
    expect(requestReward(cancelled, reward, later)?.rewardRequests[0].status).toBe("pending");
  });

  it("lets a parent reject only pending requests and allows a new request afterwards", () => {
    const today = day("2026-08-01");
    const state = { ...initialWorkspaceState(today), points: 120 };
    const reward = { id: "reward-snack", name: "零食", cost: 80 };
    const requested = requestReward(state, reward, today)!;
    const requestId = requested.rewardRequests[0].id;

    expect(rejectReward(requested, requestId, "0000", today)).toBeNull();
    const rejected = rejectReward(requested, requestId, "0801", today)!;
    expect(rejected.points).toBe(120);
    expect(rejected.rewardRequests[0].status).toBe("rejected");
    expect(rejected.rewardRequests[0].rejectedAt).toBe(today.toISOString());

    const later = new Date(today.getTime() + 60_000);
    expect(requestReward(rejected, reward, later)).not.toBeNull();

    const approved = approveReward(requested, requestId, "0801", today)!;
    expect(cancelReward(approved, requestId, today)).toBeNull();
    expect(rejectReward(approved, requestId, "0801", today)).toBeNull();
  });

  it("uses the current month and day as the PIN for protected adjustments", () => {
    const state = { ...initialWorkspaceState(), points: 10 };
    const augustFirst = day("2026-08-01");
    expect(dailyParentPin(augustFirst)).toBe("0801");
    expect(dailyParentPin(day("2026-12-09"))).toBe("1209");
    expect(adjustPoints(state, 10, "2580", augustFirst)).toBeNull();
    const adjusted = adjustPoints(state, -50, "0801", augustFirst)!;
    expect(adjusted.points).toBe(0);
    expect(adjusted.pointRecords[0]).toMatchObject({ delta: -10, reason: "adjustment" });
  });

  it("builds fallback point records for stored data without ledger details", () => {
    const normalized = normalizeWorkspaceState({
      points: 40,
      dailyEarnedPoints: { "2026-08-01": 120 },
      rewardRequests: [{
        id: "reward-1",
        rewardId: "reward-snack",
        rewardName: "零食",
        cost: 80,
        status: "fulfilled",
        requestedAt: "2026-08-02T01:00:00.000Z",
        approvedAt: "2026-08-02T01:05:00.000Z",
        fulfilledAt: "2026-08-02T01:10:00.000Z",
      }],
    }, day("2026-08-03"));

    expect(normalized.pointRecords.map((record) => record.delta).reduce((sum, delta) => sum + delta, 0)).toBe(40);
    expect(normalized.pointRecords.map((record) => record.reason)).toContain("legacy_daily_earned");
    expect(normalized.pointRecords.map((record) => record.reason)).toContain("reward");
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
    const expectedKinds = {
      "game-hanzi": "compose",
      "game-number": "sudoku",
      "game-spot": "multiplication-match",
      "game-logic": "pattern",
    } as const;
    for (const [taskId, bank] of Object.entries(gameQuestionBanks)) {
      expect(bank.length).toBeGreaterThanOrEqual(40);
      expect(new Set(bank.map((challenge) => challenge.kind))).toEqual(new Set([expectedKinds[taskId as keyof typeof expectedKinds]]));
      for (const challenge of bank) {
        if (challenge.kind === "compose") {
          expect(challenge.parts).toHaveLength(2);
          expect(challenge.word.length).toBeGreaterThan(1);
          expect(challenge.options).toHaveLength(3);
          expect(challenge.options).toContain(challenge.answer);
        } else if (challenge.kind === "sudoku") {
          expect(challenge.grid).toHaveLength(36);
          expect(challenge.solution).toHaveLength(36);
          expect(challenge.grid.filter((value) => value === 0).length).toBeGreaterThanOrEqual(14);
          expect(challenge.options).toEqual([1, 2, 3, 4, 5, 6]);
          expect(challenge.answer).toBe(challenge.solution.join(","));
        } else if (challenge.kind === "multiplication-match") {
          expect(challenge.tiles).toHaveLength(36);
          expect(challenge.tiles.every((tile) => tile.product >= 1 && tile.product <= 81)).toBe(true);
          expect(challenge.tiles.filter((tile) => tile.kind === "expression")).toHaveLength(18);
          expect(challenge.tiles.filter((tile) => tile.kind === "answer")).toHaveLength(18);
          const expressions = challenge.tiles.filter((tile) => tile.kind === "expression");
          const answers = challenge.tiles.filter((tile) => tile.kind === "answer");
          expect(expressions.every((tile) => /^[1-9] × [1-9]$/.test(tile.label))).toBe(true);
          expect(answers.every((tile) => /^[1-9][0-9]?$/.test(tile.label))).toBe(true);
          expect(new Set(expressions.map((tile) => tile.label)).size).toBe(18);
          expect(new Set(answers.map((tile) => tile.product)).size).toBe(18);
          for (const expression of challenge.tiles.filter((tile) => tile.kind === "expression")) {
            expect(challenge.tiles.some((tile) => tile.kind === "answer" && tile.product === expression.product)).toBe(true);
          }
        } else if (challenge.kind === "pattern") {
          expect(challenge.sequence).toHaveLength(6);
          expect(challenge.sequence[4]).toBeNull();
          expect(challenge.options).toHaveLength(3);
          expect(challenge.options).toContain(challenge.answer);
        }
      }
      const first = getGameChallenges(taskId, day("2026-08-03"));
      expect(first).toEqual(getGameChallenges(taskId, day("2026-08-03")));
      expect(first).toHaveLength(8);
      expect(new Set(first.map((item) => item.question)).size).toBe(8);

      const weekQuestions = Array.from({ length: 7 }, (_, offset) => {
        const value = day("2026-08-03");
        value.setDate(value.getDate() + offset);
        return getGameChallenges(taskId, value);
      }).flat();
      expect(new Set(weekQuestions.map((item) => item.question)).size).toBe(40);
    }
  });

  it("lets every game award points after the full round is played", () => {
    const games = taskCatalog.filter((task) => task.category === "game");
    expect(games).toHaveLength(4);
    for (const game of games) expect(game.minimumScore).toBe(0);
    expect(games.every((game) => !allowsDirectCompletion(game))).toBe(true);
    expect(allowsDirectCompletion(taskCatalog.find((task) => task.id === "chinese-morning-reading")!)).toBe(true);
  });

  it("restores locally completed game cards for today", () => {
    const today = day("2026-08-04");
    const state = { ...initialWorkspaceState(today), completedTaskIds: ["game-spot"] };

    expect(completedTaskIdsForToday(state)).toEqual(["game-spot"]);
  });

  it("rolls back today's game records and task points without touching other tasks", () => {
    const today = day("2026-08-04");
    const withGame = completeTask(initialWorkspaceState(today), "game-spot", 3, [], {}, today);
    const withOtherTask = completeTask(withGame, "math-arithmetic", 5, [], {}, today);
    const reset = resetTodayGameCompletions(withOtherTask, today);

    expect(reset.points).toBe(20);
    expect(reset.completedTaskIds).toEqual(["math-arithmetic"]);
    expect(reset.taskResults.map((result) => result.taskId)).toEqual(["math-arithmetic"]);
    expect(reset.pointRecords.filter((record) => record.reason === "task").map((record) => record.sourceId)).toEqual(["math-arithmetic"]);
  });

  it("matches an expression with its answer tile regardless of position", () => {
    const tiles = [
      { kind: "expression" as const, product: 12 },
      { kind: "answer" as const, product: 15 },
      { kind: "answer" as const, product: 12 },
      { kind: "expression" as const, product: 15 },
    ];

    expect(isMultiplicationMatch(0, 2, tiles)).toBe(true);
    expect(isMultiplicationMatch(3, 1, tiles)).toBe(true);
    expect(isMultiplicationMatch(0, 1, tiles)).toBe(false);
    expect(isMultiplicationMatch(2, 0, tiles)).toBe(false);
  });

  it("provides 40 age-appropriate integer word problems", () => {
    expect(wordProblems).toHaveLength(40);
    for (const problem of wordProblems) {
      expect(Number.isInteger(problem.result)).toBe(true);
      expect(problem.result).toBeGreaterThan(0);
      expect(problem.result).toBeLessThanOrEqual(100);
      expect(problem.answer).toContain("=");
      expect(problem.answer).toContain(`（${problem.unit}）`);
      expect(wordProblemAnswerMatches(problem.answer, problem)).toBe(true);
      expect(wordProblemAnswerMatches(String(problem.result), problem)).toBe(false);
      expect(wordProblemAnswerMatches(`${problem.left}${problem.operator}${problem.right}=${problem.result}`, problem)).toBe(false);
    }
  });

  it("accepts common equivalent word-problem equation formats without dropping the unit", () => {
    const addition = wordProblems.find((problem) => problem.operator === "+")!;
    const multiplication = wordProblems.find((problem) => problem.operator === "×")!;
    expect(wordProblemAnswerMatches(`${addition.right}+${addition.left}=${addition.result}${addition.unit}`, addition)).toBe(true);
    expect(wordProblemAnswerMatches(`${multiplication.right}*${multiplication.left}=${multiplication.result}(${multiplication.unit})`, multiplication)).toBe(true);
    expect(wordProblemAnswerMatches(`${addition.left}+${addition.right}=${addition.result}个`, addition)).toBe(addition.unit === "个");
  });

  it("provides eight complete Yilin Grade 2A English units", () => {
    expect(weeklyContent).toHaveLength(8);
    expect(new Set(weeklyContent.map((content) => content.english.unit)).size).toBe(8);
    for (const content of weeklyContent) {
      expect(content.english.words.length).toBeGreaterThanOrEqual(6);
      expect(new Set(content.english.words.map((word) => word.word)).size).toBe(content.english.words.length);
      expect(content.english.patterns.length).toBeGreaterThanOrEqual(3);
      expect(content.english.tasks.length).toBeGreaterThanOrEqual(4);
      expect(content.english.chant.split(/\s+/).length).toBeGreaterThanOrEqual(6);
    }
  });

  it("uses a different icon for every navigation item", () => {
    const icons = Object.values(sectionMeta).map((item) => item.navIcon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("provides unique short labels for mobile navigation", () => {
    const labels = Object.values(sectionMeta).map((item) => item.mobileLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
