import { describe, expect, it } from "vitest";
import { readingComprehensions } from "./data";
import { areAllArithmeticAnswersFilled, arithmeticScore, findWrongArithmeticIndices, matchKeywordGroups } from "./learningRules";

describe("reading short-answer rules", () => {
  it("accepts equivalent wording and ignores punctuation and spaces", () => {
    const groups = [["雪化成水", "雪化了"], ["长出小苗", "发芽"]];
    expect(matchKeywordGroups("雪 化 了，小松果也发芽了！", groups)).toEqual({ correct: true, missingGroups: [] });
  });

  it("rejects unrelated or incomplete answers and reports missing concepts", () => {
    const groups = [["分享雨伞", "一起打伞"], ["帮助", "关心"]];
    expect(matchKeywordGroups("很好", groups).correct).toBe(false);
    expect(matchKeywordGroups("他们一起打伞", groups).missingGroups).toEqual([["帮助", "关心"]]);
  });

  it("configures keyword groups for every short-answer question", () => {
    const shortAnswers = readingComprehensions.flatMap((item) => item.questions).filter((question) => question.type === "short-answer");
    expect(shortAnswers.length).toBeGreaterThan(0);
    for (const question of shortAnswers) expect(question.keywordGroups?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("arithmetic retry rules", () => {
  const questions = [
    { prompt: "18+7=", answer: 25 },
    { prompt: "42-8=", answer: 34 },
    { prompt: "36+9=", answer: 45 },
    { prompt: "70-6=", answer: 64 },
    { prompt: "21+8=", answer: 29 },
  ];

  it("keeps only unresolved wrong questions during retry", () => {
    const firstAnswers = { 0: "25", 1: "35", 2: "45", 3: "63", 4: "29" };
    const initialWrong = findWrongArithmeticIndices(questions, firstAnswers);
    expect(initialWrong).toEqual([1, 3]);
    expect(arithmeticScore(questions.length, initialWrong.length)).toBe(60);

    const retriedAnswers = { ...firstAnswers, 1: "34", 3: "64" };
    expect(findWrongArithmeticIndices(questions, retriedAnswers, initialWrong)).toEqual([]);
    expect(arithmeticScore(questions.length, 0)).toBe(100);
  });

  it("requires every displayed arithmetic answer before checking", () => {
    expect(areAllArithmeticAnswersFilled(questions, { 0: "25", 1: "34" })).toBe(false);
    expect(areAllArithmeticAnswersFilled(questions, { 0: "25", 1: "34" }, [1])).toBe(true);
    expect(areAllArithmeticAnswersFilled(questions, { 0: "25", 1: "34", 2: "45", 3: "64", 4: "29" })).toBe(true);
  });
});
