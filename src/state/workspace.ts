export const STORAGE_KEY = 'my-work-buddy-state-v2';
export const LEGACY_STORAGE_KEY = 'my-work-buddy-state-v1';

export interface TaskResult {
  taskId: string;
  dateKey: string;
  score?: number;
  durationSeconds: number;
  attempts: number;
  wrongQuestions: string[];
  evidence?: string;
  completedAt: string;
}

export interface PendingTaskReview {
  id: string;
  taskId: string;
  taskTitle: string;
  points: number;
  dateKey: string;
  result: CompletionResultInput;
  submittedAt: string;
}

export type RewardRequestStatus = 'pending' | 'approved' | 'fulfilled';

export interface RewardRequest {
  id: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  status: RewardRequestStatus;
  requestedAt: string;
  approvedAt?: string;
  fulfilledAt?: string;
}

export interface WorkspaceState {
  dateKey: string;
  points: number;
  completedTaskIds: string[];
  bonusAwarded: boolean;
  completedDates: string[];
  taskResults: TaskResult[];
  pendingTaskReviews: PendingTaskReview[];
  weeklyPoints: Record<string, number>;
  dailyEarnedPoints: Record<string, number>;
  rewardRequests: RewardRequest[];
  notifiedDailyReadyDates: string[];
}

interface LegacyWorkspaceState {
  dateKey?: string;
  points?: number;
  completedTaskIds?: string[];
  bonusAwarded?: boolean;
  completedDates?: string[];
  redemptions?: Array<{ id: string; rewardId: string; rewardName: string; cost: number; redeemedAt: string }>;
}

export interface CompletionResultInput {
  score?: number;
  durationSeconds?: number;
  attempts?: number;
  wrongQuestions?: string[];
  evidence?: string;
}

export const dateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const weekKey = (date = new Date()) => {
  const monday = new Date(date);
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  return dateKey(monday);
};

export const initialWorkspaceState = (today = new Date()): WorkspaceState => ({
  dateKey: dateKey(today),
  points: 0,
  completedTaskIds: [],
  bonusAwarded: false,
  completedDates: [],
  taskResults: [],
  pendingTaskReviews: [],
  weeklyPoints: {},
  dailyEarnedPoints: {},
  rewardRequests: [],
  notifiedDailyReadyDates: [],
});

export const refreshDailyState = (state: WorkspaceState, today = new Date()): WorkspaceState => {
  const todayKey = dateKey(today);
  if (state.dateKey === todayKey) return state;

  return {
    ...state,
    dateKey: todayKey,
    completedTaskIds: [],
    bonusAwarded: false,
    pendingTaskReviews: [],
  };
};

export const completeTask = (
  state: WorkspaceState,
  taskId: string,
  reward: number,
  requiredTaskIds: string[],
  result: CompletionResultInput = {},
  today = new Date(),
): WorkspaceState => {
  const freshState = refreshDailyState(state, today);
  if (freshState.completedTaskIds.includes(taskId)) return freshState;

  const completedTaskIds = [...freshState.completedTaskIds, taskId];
  const allDone = requiredTaskIds.every((id) => completedTaskIds.includes(id));
  const shouldAwardBonus = allDone && !freshState.bonusAwarded;
  const todayKey = dateKey(today);
  const awardedPoints = reward + (shouldAwardBonus ? 15 : 0);
  const currentWeek = weekKey(today);
  const taskResult: TaskResult = {
    taskId,
    dateKey: todayKey,
    score: result.score,
    durationSeconds: result.durationSeconds ?? 0,
    attempts: result.attempts ?? 1,
    wrongQuestions: result.wrongQuestions ?? [],
    evidence: result.evidence,
    completedAt: today.toISOString(),
  };

  return {
    ...freshState,
    points: freshState.points + awardedPoints,
    completedTaskIds,
    bonusAwarded: freshState.bonusAwarded || shouldAwardBonus,
    completedDates: shouldAwardBonus
      ? Array.from(new Set([...freshState.completedDates, todayKey])).sort()
      : freshState.completedDates,
    taskResults: [...freshState.taskResults, taskResult],
    weeklyPoints: {
      ...freshState.weeklyPoints,
      [currentWeek]: (freshState.weeklyPoints[currentWeek] ?? 0) + awardedPoints,
    },
    dailyEarnedPoints: {
      ...freshState.dailyEarnedPoints,
      [todayKey]: (freshState.dailyEarnedPoints[todayKey] ?? 0) + awardedPoints,
    },
  };
};

export const submitTaskReview = (
  state: WorkspaceState,
  task: { id: string; title: string; points: number },
  result: CompletionResultInput,
  now = new Date(),
): WorkspaceState => {
  const freshState = refreshDailyState(state, now);
  if (freshState.completedTaskIds.includes(task.id) || freshState.pendingTaskReviews.some((review) => review.taskId === task.id)) return freshState;

  return {
    ...freshState,
    pendingTaskReviews: [...freshState.pendingTaskReviews, {
      id: `${freshState.dateKey}-${task.id}`,
      taskId: task.id,
      taskTitle: task.title,
      points: task.points,
      dateKey: freshState.dateKey,
      result,
      submittedAt: now.toISOString(),
    }],
  };
};

export const isDailyReadyForNotification = (state: WorkspaceState, requiredTaskIds: string[]) => {
  if (!requiredTaskIds.length) return false;
  const readyTaskIds = new Set([
    ...state.completedTaskIds,
    ...state.pendingTaskReviews
      .filter((review) => review.dateKey === state.dateKey)
      .map((review) => review.taskId),
  ]);
  return requiredTaskIds.every((taskId) => readyTaskIds.has(taskId));
};

export const markDailyReadyNotified = (state: WorkspaceState, notifiedDateKey = state.dateKey): WorkspaceState => {
  if (state.notifiedDailyReadyDates.includes(notifiedDateKey)) return state;
  return {
    ...state,
    notifiedDailyReadyDates: [...state.notifiedDailyReadyDates, notifiedDateKey].sort(),
  };
};

export const approveTaskReview = (
  state: WorkspaceState,
  reviewId: string,
  requiredTaskIds: string[],
  pin: string,
  now = new Date(),
): WorkspaceState | null => {
  if (!verifyParentPin(state, pin, now)) return null;
  const freshState = refreshDailyState(state, now);
  const review = freshState.pendingTaskReviews.find((item) => item.id === reviewId && item.dateKey === freshState.dateKey);
  if (!review) return null;
  const completed = completeTask(freshState, review.taskId, review.points, requiredTaskIds, review.result, now);
  return { ...completed, pendingTaskReviews: completed.pendingTaskReviews.filter((item) => item.id !== reviewId) };
};

export const approveAllTaskReviews = (
  state: WorkspaceState,
  requiredTaskIds: string[],
  pin: string,
  now = new Date(),
): WorkspaceState | null => {
  if (!verifyParentPin(state, pin, now)) return null;
  const freshState = refreshDailyState(state, now);
  if (!freshState.pendingTaskReviews.length) return freshState;
  const completed = freshState.pendingTaskReviews.reduce(
    (current, review) => completeTask(current, review.taskId, review.points, requiredTaskIds, review.result, now),
    freshState,
  );
  return { ...completed, pendingTaskReviews: [] };
};

export const rejectTaskReview = (state: WorkspaceState, reviewId: string, pin: string, now = new Date()): WorkspaceState | null => {
  if (!verifyParentPin(state, pin, now)) return null;
  const freshState = refreshDailyState(state, now);
  if (!freshState.pendingTaskReviews.some((review) => review.id === reviewId)) return null;
  return { ...freshState, pendingTaskReviews: freshState.pendingTaskReviews.filter((review) => review.id !== reviewId) };
};

export const isWeekend = (today = new Date()) => today.getDay() === 0 || today.getDay() === 6;

export const requestReward = (
  state: WorkspaceState,
  reward: { id: string; name: string; cost: number },
  now = new Date(),
): WorkspaceState | null => {
  if (!isWeekend(now) || state.points < reward.cost) return null;
  if (state.rewardRequests.some((item) => item.rewardId === reward.id && item.status !== 'fulfilled')) return null;

  return {
    ...state,
    rewardRequests: [
      {
        id: `${reward.id}-${now.getTime()}`,
        rewardId: reward.id,
        rewardName: reward.name,
        cost: reward.cost,
        status: 'pending',
        requestedAt: now.toISOString(),
      },
      ...state.rewardRequests,
    ],
  };
};

export const dailyParentPin = (today = new Date()) => `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

export const verifyParentPin = (_state: WorkspaceState, pin: string, today = new Date()) => dailyParentPin(today) === pin;

export const approveReward = (state: WorkspaceState, requestId: string, pin: string, now = new Date()): WorkspaceState | null => {
  if (!verifyParentPin(state, pin, now)) return null;
  const request = state.rewardRequests.find((item) => item.id === requestId);
  if (!request || request.status !== 'pending' || state.points < request.cost) return null;

  return {
    ...state,
    points: state.points - request.cost,
    rewardRequests: state.rewardRequests.map((item) => item.id === requestId
      ? { ...item, status: 'approved', approvedAt: now.toISOString() }
      : item),
  };
};

export const fulfillReward = (state: WorkspaceState, requestId: string, pin: string, now = new Date()): WorkspaceState | null => {
  if (!verifyParentPin(state, pin, now)) return null;
  if (!state.rewardRequests.some((item) => item.id === requestId && item.status === 'approved')) return null;

  return {
    ...state,
    rewardRequests: state.rewardRequests.map((item) => item.id === requestId
      ? { ...item, status: 'fulfilled', fulfilledAt: now.toISOString() }
      : item),
  };
};

export const adjustPoints = (state: WorkspaceState, amount: number, pin: string, now = new Date()): WorkspaceState | null => {
  if (!verifyParentPin(state, pin, now) || !Number.isInteger(amount) || amount === 0) return null;
  return { ...state, points: Math.max(0, state.points + amount) };
};

const shiftDate = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const calculateStreak = (completedDates: string[], today = new Date()) => {
  const completed = new Set(completedDates);
  let cursor = completed.has(dateKey(today)) ? today : shiftDate(today, -1);
  let streak = 0;

  while (completed.has(dateKey(cursor))) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
};

export const unlockedBadges = (streak: number) => [7, 14, 30].filter((days) => streak >= days);

const summarizeReport = (results: TaskResult[], completedDays: number, earnedPoints: number, rewardRequests: RewardRequest[]) => {
  const arithmeticResults = results.filter((result) => result.taskId === 'math-arithmetic' && result.score !== undefined);
  const totalDurationSeconds = results.reduce((sum, result) => sum + result.durationSeconds, 0);
  const arithmeticAverage = arithmeticResults.length
    ? Math.round(arithmeticResults.reduce((sum, result) => sum + (result.score ?? 0), 0) / arithmeticResults.length)
    : 0;
  const wrongQuestions = results.flatMap((result) => result.wrongQuestions);

  return {
    completedDays,
    taskCount: results.length,
    totalDurationSeconds,
    arithmeticAverage,
    wrongQuestions,
    earnedPoints,
    rewardRequests,
  };
};

export const getDailyReport = (state: WorkspaceState, today = new Date()) => {
  const currentDay = dateKey(today);
  return summarizeReport(
    state.taskResults.filter((result) => result.dateKey === currentDay),
    state.completedDates.includes(currentDay) ? 1 : 0,
    state.dailyEarnedPoints[currentDay] ?? 0,
    state.rewardRequests.filter((request) => request.requestedAt.slice(0, 10) === currentDay),
  );
};

export const getWeeklyReport = (state: WorkspaceState, today = new Date()) => {
  const currentWeek = weekKey(today);
  return summarizeReport(
    state.taskResults.filter((result) => weekKey(new Date(`${result.dateKey}T12:00:00`)) === currentWeek),
    state.completedDates.filter((value) => weekKey(new Date(`${value}T12:00:00`)) === currentWeek).length,
    state.weeklyPoints[currentWeek] ?? 0,
    state.rewardRequests.filter((request) => weekKey(new Date(request.requestedAt)) === currentWeek),
  );
};

export const getMonthlyReport = (state: WorkspaceState, today = new Date()) => {
  const currentMonth = dateKey(today).slice(0, 7);
  return summarizeReport(
    state.taskResults.filter((result) => result.dateKey.startsWith(currentMonth)),
    state.completedDates.filter((value) => value.startsWith(currentMonth)).length,
    Object.entries(state.dailyEarnedPoints).filter(([value]) => value.startsWith(currentMonth)).reduce((sum, [, points]) => sum + points, 0),
    state.rewardRequests.filter((request) => request.requestedAt.startsWith(currentMonth)),
  );
};

export const migrateLegacyState = (legacy: LegacyWorkspaceState, today = new Date()): WorkspaceState => {
  const initial = initialWorkspaceState(today);
  return refreshDailyState({
    ...initial,
    dateKey: legacy.dateKey ?? initial.dateKey,
    points: legacy.points ?? 0,
    completedTaskIds: legacy.completedTaskIds ?? [],
    bonusAwarded: legacy.bonusAwarded ?? false,
    completedDates: legacy.completedDates ?? [],
    rewardRequests: (legacy.redemptions ?? []).map((item) => ({
      id: item.id,
      rewardId: item.rewardId,
      rewardName: item.rewardName,
      cost: item.cost,
      status: 'fulfilled',
      requestedAt: item.redeemedAt,
      approvedAt: item.redeemedAt,
      fulfilledAt: item.redeemedAt,
    })),
  }, today);
};

export const normalizeWorkspaceState = (parsed: Partial<WorkspaceState>, today: Date): WorkspaceState => {
  const initial = initialWorkspaceState(today);
  return refreshDailyState({
    dateKey: parsed.dateKey ?? initial.dateKey,
    points: parsed.points ?? 0,
    completedTaskIds: parsed.completedTaskIds ?? [],
    bonusAwarded: parsed.bonusAwarded ?? false,
    completedDates: parsed.completedDates ?? [],
    taskResults: parsed.taskResults ?? [],
    pendingTaskReviews: parsed.pendingTaskReviews ?? [],
    weeklyPoints: parsed.weeklyPoints ?? {},
    dailyEarnedPoints: parsed.dailyEarnedPoints ?? {},
    rewardRequests: parsed.rewardRequests ?? [],
    notifiedDailyReadyDates: parsed.notifiedDailyReadyDates ?? [],
  }, today);
};

export const readStoredState = (today = new Date()): WorkspaceState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return normalizeWorkspaceState(JSON.parse(saved) as Partial<WorkspaceState>, today);
    } catch {
      return initialWorkspaceState(today);
    }
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return initialWorkspaceState(today);
  try {
    return migrateLegacyState(JSON.parse(legacy) as LegacyWorkspaceState, today);
  } catch {
    return initialWorkspaceState(today);
  }
};
