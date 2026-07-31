import type { MathDrill } from "../types";

export const mathDrills = [
  {
    id: "math-within-100",
    title: "百以内心算",
    skill: "100以内加减法",
    description: "先看个位，再看十位，练习准确心算。",
    difficulty: "基础",
    questionCount: 10,
    timeLimitMinutes: 5,
    examples: [
      { prompt: "36 + 20 = ?", answer: "56" },
      { prompt: "74 - 30 = ?", answer: "44" },
      { prompt: "28 + 7 = ?", answer: "35" },
    ],
    rewardStars: 5,
  },
  {
    id: "math-carry-borrow",
    title: "进位与退位",
    skill: "两位数加减法",
    description: "列竖式时相同数位对齐，从个位算起。",
    difficulty: "进阶",
    questionCount: 8,
    timeLimitMinutes: 8,
    examples: [
      { prompt: "47 + 38 = ?", answer: "85" },
      { prompt: "82 - 46 = ?", answer: "36" },
    ],
    rewardStars: 5,
  },
  {
    id: "math-multiplication-2-6",
    title: "乘法小火车",
    skill: "2—6的乘法口诀",
    description: "把相同加数写成乘法，边读口诀边作答。",
    difficulty: "进阶",
    questionCount: 12,
    timeLimitMinutes: 6,
    examples: [
      { prompt: "4 × 3 = ?", answer: "12" },
      { prompt: "5 + 5 + 5 = ? × ?", answer: "5 × 3" },
      { prompt: "二六（  ）", answer: "十二" },
    ],
    rewardStars: 5,
  },
] satisfies MathDrill[];
