export const STORAGE_KEY = 'my-work-buddy-state-v2';
export const LEGACY_STORAGE_KEY = 'my-work-buddy-state-v1';

export type PetItemId = 'parrot-food' | 'apple-bites' | 'bell-toy' | 'bath-spray';
export type PetAction = 'feed' | 'play' | 'bathe';
export type PetLastAction = PetAction | 'purchase' | 'idle';

export interface PetItemDefinition {
  id: PetItemId;
  name: string;
  price: number;
  kind: 'food' | 'toy' | 'care';
  description: string;
}

export interface PetState {
  name: string;
  satiety: number;
  happiness: number;
  cleanliness: number;
  inventory: Partial<Record<PetItemId, number>>;
  ownedToys: PetItemId[];
  lastAction: PetLastAction;
  lastMessage: string;
  lastRefreshedDate: string;
}

export const petItemDefinitions: PetItemDefinition[] = [
  { id: 'parrot-food', name: '鹦鹉粮', price: 3, kind: 'food', description: '一项基础任务即可兑换，补充当日饱腹度。' },
  { id: 'apple-bites', name: '苹果粒', price: 4, kind: 'food', description: '额外补充饱腹度和开心度。' },
  { id: 'bell-toy', name: '叮当铃玩具', price: 20, kind: 'toy', description: '接近完成整套今日任务后永久解锁。' },
  { id: 'bath-spray', name: '羽毛沐浴喷雾', price: 4, kind: 'care', description: '约每两天使用一次，恢复清洁度。' },
];

export interface TaskResult {
  taskId: string;
  dateKey: string;
  score?: number;
  firstScore?: number;
  durationSeconds: number;
  attempts: number;
  wrongQuestions: string[];
  answers?: Record<string, string>;
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

export type RewardRequestStatus = 'pending' | 'approved' | 'fulfilled' | 'cancelled' | 'rejected';

export interface RewardRequest {
  id: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  status: RewardRequestStatus;
  requestedAt: string;
  approvedAt?: string;
  fulfilledAt?: string;
  cancelledAt?: string;
  rejectedAt?: string;
}

export interface WorkspaceState {
  dateKey: string;
  points: number;
  pet: PetState;
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
  firstScore?: number;
  durationSeconds?: number;
  attempts?: number;
  wrongQuestions?: string[];
  answers?: Record<string, string>;
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

const clampPetStat = (value: number) => Math.max(0, Math.min(100, value));

export const initialPetState = (today = new Date()): PetState => ({
  name: '嘟嘟',
  satiety: 72,
  happiness: 78,
  cleanliness: 82,
  inventory: {},
  ownedToys: [],
  lastAction: 'idle',
  lastMessage: '啾！今天的值班铲屎官到岗了吗？',
  lastRefreshedDate: dateKey(today),
});

const refreshPetProfile = (pet: PetState, today = new Date()): PetState => {
  const todayKey = dateKey(today);
  if (pet.lastRefreshedDate === todayKey) return pet;

  const satiety = clampPetStat(pet.satiety - 10);
  const happiness = clampPetStat(pet.happiness - 7);
  const cleanliness = clampPetStat(pet.cleanliness - 6);
  const lowest = Math.min(satiety, happiness, cleanliness);
  const lastMessage = lowest === satiety
    ? '我肚子里的小鼓已经停止演奏了，懂我意思吧？'
    : lowest === cleanliness
      ? '羽毛有点不听话，本鸟申请一个豪华水疗。'
      : '叮当铃不响的时候，我连搞怪都没力气。';

  return { ...pet, satiety, happiness, cleanliness, lastAction: 'idle', lastMessage, lastRefreshedDate: todayKey };
};

export const initialWorkspaceState = (today = new Date()): WorkspaceState => ({
  dateKey: dateKey(today),
  points: 0,
  pet: initialPetState(today),
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

export const refreshPetState = (state: WorkspaceState, today = new Date()): WorkspaceState => {
  const pet = refreshPetProfile(state.pet, today);
  return pet === state.pet ? state : { ...state, pet };
};

export const refreshDailyState = (state: WorkspaceState, today = new Date()): WorkspaceState => {
  const freshState = refreshPetState(state, today);
  const todayKey = dateKey(today);
  if (freshState.dateKey === todayKey) return freshState;

  return {
    ...freshState,
    dateKey: todayKey,
    completedTaskIds: [],
    bonusAwarded: false,
    pendingTaskReviews: [],
  };
};

export const purchasePetItem = (state: WorkspaceState, itemId: PetItemId, now = new Date()): WorkspaceState | null => {
  const freshState = refreshPetState(state, now);
  const item = petItemDefinitions.find((candidate) => candidate.id === itemId);
  if (!item || freshState.points < item.price) return null;
  if (item.kind === 'toy' && freshState.pet.ownedToys.includes(item.id)) return null;

  const pet = item.kind === 'toy'
    ? { ...freshState.pet, ownedToys: [...freshState.pet.ownedToys, item.id] }
    : { ...freshState.pet, inventory: { ...freshState.pet.inventory, [item.id]: (freshState.pet.inventory[item.id] ?? 0) + 1 } };

  return {
    ...freshState,
    points: freshState.points - item.price,
    pet: {
      ...pet,
      lastAction: 'purchase',
      lastMessage: item.kind === 'toy'
        ? '叮当铃已签收！本鸟宣布客厅从此归我巡演。'
        : `${item.name}已入库，看来你很懂本鸟的排面。`,
    },
  };
};

export const interactWithPet = (state: WorkspaceState, action: PetAction, itemId: PetItemId, now = new Date()): WorkspaceState | null => {
  const freshState = refreshPetState(state, now);
  const item = petItemDefinitions.find((candidate) => candidate.id === itemId);
  if (!item) return null;

  if (action === 'play') {
    if (item.kind !== 'toy' || !freshState.pet.ownedToys.includes(itemId)) return null;
    return {
      ...freshState,
      pet: {
        ...freshState.pet,
        happiness: clampPetStat(freshState.pet.happiness + 15),
        lastAction: action,
        lastMessage: '叮铃铃！看我表演一个原地起飞……算了，先鼓掌。',
      },
    };
  }

  const count = freshState.pet.inventory[itemId] ?? 0;
  if (count < 1 || (action === 'feed' && item.kind !== 'food') || (action === 'bathe' && item.kind !== 'care')) return null;
  const inventory = { ...freshState.pet.inventory, [itemId]: count - 1 };

  if (action === 'feed') {
    const isApple = itemId === 'apple-bites';
    return {
      ...freshState,
      pet: {
        ...freshState.pet,
        satiety: clampPetStat(freshState.pet.satiety + (isApple ? 10 : 14)),
        happiness: clampPetStat(freshState.pet.happiness + (isApple ? 10 : 0)),
        inventory,
        lastAction: action,
        lastMessage: isApple ? '苹果粒到嘴，本鸟宣布今天是好日子！' : '咔嚓咔嚓！这口粮，勉强给你五星好评。',
      },
    };
  }

  return {
    ...freshState,
    pet: {
      ...freshState.pet,
      cleanliness: clampPetStat(freshState.pet.cleanliness + 12),
      inventory,
      lastAction: action,
      lastMessage: '洗完啦！现在每根羽毛都在偷偷发光。',
    },
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
    firstScore: result.firstScore,
    durationSeconds: result.durationSeconds ?? 0,
    attempts: result.attempts ?? 1,
    wrongQuestions: result.wrongQuestions ?? [],
    answers: result.answers,
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
  if (state.rewardRequests.some((item) => item.rewardId === reward.id && (item.status === 'pending' || item.status === 'approved'))) return null;

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

export const cancelReward = (state: WorkspaceState, requestId: string, now = new Date()): WorkspaceState | null => {
  if (!state.rewardRequests.some((item) => item.id === requestId && item.status === 'pending')) return null;
  return {
    ...state,
    rewardRequests: state.rewardRequests.map((item) => item.id === requestId
      ? { ...item, status: 'cancelled', cancelledAt: now.toISOString() }
      : item),
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

export const rejectReward = (state: WorkspaceState, requestId: string, pin: string, now = new Date()): WorkspaceState | null => {
  if (!verifyParentPin(state, pin, now)) return null;
  if (!state.rewardRequests.some((item) => item.id === requestId && item.status === 'pending')) return null;

  return {
    ...state,
    rewardRequests: state.rewardRequests.map((item) => item.id === requestId
      ? { ...item, status: 'rejected', rejectedAt: now.toISOString() }
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
  const arithmeticResults = results.filter((result) => result.taskId === 'math-arithmetic' && (result.firstScore ?? result.score) !== undefined);
  const totalDurationSeconds = results.reduce((sum, result) => sum + result.durationSeconds, 0);
  const arithmeticAverage = arithmeticResults.length
    ? Math.round(arithmeticResults.reduce((sum, result) => sum + (result.firstScore ?? result.score ?? 0), 0) / arithmeticResults.length)
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

const normalizePetState = (parsed: Partial<PetState> | undefined, today: Date): PetState => {
  const initial = initialPetState(today);
  return refreshPetProfile({
    ...initial,
    ...parsed,
    name: parsed?.name === '啾啾' ? '嘟嘟' : parsed?.name ?? initial.name,
    inventory: { ...initial.inventory, ...parsed?.inventory },
    ownedToys: parsed?.ownedToys ?? initial.ownedToys,
  }, today);
};

export const normalizeWorkspaceState = (parsed: Partial<WorkspaceState>, today: Date): WorkspaceState => {
  const initial = initialWorkspaceState(today);
  return refreshDailyState({
    dateKey: parsed.dateKey ?? initial.dateKey,
    points: parsed.points ?? 0,
    pet: normalizePetState(parsed.pet, today),
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
