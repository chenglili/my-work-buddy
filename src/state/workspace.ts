export const STORAGE_KEY = 'my-work-buddy-state-v1';

export interface RedemptionRecord {
  id: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  redeemedAt: string;
}

export interface WorkspaceState {
  dateKey: string;
  points: number;
  completedTaskIds: string[];
  bonusAwarded: boolean;
  completedDates: string[];
  redemptions: RedemptionRecord[];
}

export const dateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const initialWorkspaceState = (today = new Date()): WorkspaceState => ({
  dateKey: dateKey(today),
  points: 0,
  completedTaskIds: [],
  bonusAwarded: false,
  completedDates: [],
  redemptions: [],
});

export const refreshDailyState = (state: WorkspaceState, today = new Date()): WorkspaceState => {
  const todayKey = dateKey(today);
  if (state.dateKey === todayKey) return state;

  return {
    ...state,
    dateKey: todayKey,
    completedTaskIds: [],
    bonusAwarded: false,
  };
};

export const completeTask = (
  state: WorkspaceState,
  taskId: string,
  reward: number,
  requiredTaskIds: string[],
  today = new Date(),
): WorkspaceState => {
  const freshState = refreshDailyState(state, today);
  if (freshState.completedTaskIds.includes(taskId)) return freshState;

  const completedTaskIds = [...freshState.completedTaskIds, taskId];
  const allDone = requiredTaskIds.every((id) => completedTaskIds.includes(id));
  const shouldAwardBonus = allDone && !freshState.bonusAwarded;
  const todayKey = dateKey(today);

  return {
    ...freshState,
    points: freshState.points + reward + (shouldAwardBonus ? 15 : 0),
    completedTaskIds,
    bonusAwarded: freshState.bonusAwarded || shouldAwardBonus,
    completedDates: shouldAwardBonus
      ? Array.from(new Set([...freshState.completedDates, todayKey])).sort()
      : freshState.completedDates,
  };
};

export const redeemReward = (
  state: WorkspaceState,
  reward: { id: string; name: string; cost: number },
  now = new Date(),
): WorkspaceState | null => {
  if (state.points < reward.cost) return null;

  return {
    ...state,
    points: state.points - reward.cost,
    redemptions: [
      {
        id: `${reward.id}-${now.getTime()}`,
        rewardId: reward.id,
        rewardName: reward.name,
        cost: reward.cost,
        redeemedAt: now.toISOString(),
      },
      ...state.redemptions,
    ],
  };
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

export const readStoredState = (today = new Date()): WorkspaceState => {
  const initial = initialWorkspaceState(today);
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initial;

  try {
    const parsed = JSON.parse(saved) as Partial<WorkspaceState>;
    return refreshDailyState(
      {
        dateKey: parsed.dateKey ?? initial.dateKey,
        points: parsed.points ?? 0,
        completedTaskIds: parsed.completedTaskIds ?? [],
        bonusAwarded: parsed.bonusAwarded ?? false,
        completedDates: parsed.completedDates ?? [],
        redemptions: parsed.redemptions ?? [],
      },
      today,
    );
  } catch {
    return initial;
  }
};
