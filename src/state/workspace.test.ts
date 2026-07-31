import { describe, expect, it } from 'vitest';
import {
  calculateStreak,
  completeTask,
  initialWorkspaceState,
  redeemReward,
  refreshDailyState,
} from './workspace';

const day = (value: string) => new Date(`${value}T12:00:00`);

describe('workspace state', () => {
  it('awards each task once and adds the 15-point full-day bonus', () => {
    const initial = initialWorkspaceState(day('2026-07-31'));
    const first = completeTask(initial, 'a', 5, ['a', 'b'], day('2026-07-31'));
    const duplicate = completeTask(first, 'a', 5, ['a', 'b'], day('2026-07-31'));
    const finished = completeTask(duplicate, 'b', 6, ['a', 'b'], day('2026-07-31'));

    expect(duplicate.points).toBe(5);
    expect(finished.points).toBe(26);
    expect(finished.completedDates).toEqual(['2026-07-31']);
  });

  it('resets daily tasks while preserving lifetime points and history', () => {
    const completed = completeTask(
      initialWorkspaceState(day('2026-07-30')),
      'a',
      5,
      ['a'],
      day('2026-07-30'),
    );
    const refreshed = refreshDailyState(completed, day('2026-07-31'));

    expect(refreshed.points).toBe(20);
    expect(refreshed.completedTaskIds).toEqual([]);
    expect(refreshed.completedDates).toEqual(['2026-07-30']);
  });

  it('calculates a streak from today or yesterday', () => {
    const dates = ['2026-07-28', '2026-07-29', '2026-07-30'];
    expect(calculateStreak(dates, day('2026-07-31'))).toBe(3);
  });

  it('rejects unaffordable rewards and records successful redemptions', () => {
    const state = { ...initialWorkspaceState(), points: 35 };
    expect(redeemReward(state, { id: 'toy', name: '小玩具', cost: 60 })).toBeNull();
    expect(redeemReward(state, { id: 'cartoon', name: '动画片', cost: 35 })?.points).toBe(0);
  });
});
