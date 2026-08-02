import type { Encouragement, ShopReward } from "../types";

export const shopRewards = [
  {
    id: "reward-snack",
    name: "零食",
    description: "在家长给出的健康选项中挑一份小零食。",
    category: "零食",
    costStars: 80,
    emoji: "🍓",
    available: true,
  },
  {
    id: "reward-toy",
    name: "玩具",
    description: "从家长准备的清单中挑选一个小玩具。",
    category: "玩具",
    costStars: 250,
    emoji: "🪀",
    available: true,
  },
  {
    id: "reward-cartoon-30",
    name: "动画30分钟",
    description: "由家长安排一次30分钟动画时间。",
    category: "娱乐",
    costStars: 20,
    emoji: "📺",
    available: true,
  },
] satisfies ShopReward[];

export const encouragements = [
  { id: "encourage-welcome-1", trigger: "welcome", message: "今天也从一个小任务开始吧！" },
  { id: "encourage-welcome-2", trigger: "welcome", message: "准备好了吗？新的知识正在等你发现。" },
  { id: "encourage-complete-1", trigger: "task-complete", message: "完成啦！认真坚持的你真棒。" },
  { id: "encourage-complete-2", trigger: "task-complete", message: "又前进了一小步，星星已经收到！" },
  { id: "encourage-goal", trigger: "daily-goal", message: "今日计划全部完成，可以安心休息啦！" },
  { id: "encourage-streak", trigger: "streak", message: "连续学习的好习惯正在慢慢长大。" },
  { id: "encourage-perfect", trigger: "perfect", message: "全对！你的细心和思考都闪闪发光。" },
  { id: "encourage-retry", trigger: "try-again", message: "没关系，读清题目再试一次，你会找到答案的。" },
] satisfies Encouragement[];
