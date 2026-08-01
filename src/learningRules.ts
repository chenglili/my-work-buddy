export interface KeywordMatchResult {
  correct: boolean;
  missingGroups: string[][];
}

const normalizeChineseAnswer = (value: string) => value
  .toLowerCase()
  .replace(/[\s，。！？、；：“”‘’（）《》,.!?;:'"()\-]/g, "");

export function matchKeywordGroups(answer: string, keywordGroups: string[][]): KeywordMatchResult {
  const normalizedAnswer = normalizeChineseAnswer(answer);
  const missingGroups = keywordGroups.filter((group) => !group.some((keyword) => normalizedAnswer.includes(normalizeChineseAnswer(keyword))));
  return { correct: normalizedAnswer.length > 0 && missingGroups.length === 0, missingGroups };
}

export interface ArithmeticQuestionLike {
  prompt: string;
  answer: number;
}

export function findWrongArithmeticIndices(questions: ArithmeticQuestionLike[], answers: Record<number, string>, indices = questions.map((_, index) => index)) {
  return indices.filter((index) => Number(answers[index]) !== questions[index].answer);
}

export function areAllArithmeticAnswersFilled(questions: ArithmeticQuestionLike[], answers: Record<number, string>, indices = questions.map((_, index) => index)) {
  return indices.every((index) => answers[index]?.trim().length > 0);
}

export function arithmeticScore(totalQuestions: number, unresolvedWrongCount: number) {
  if (totalQuestions <= 0) return 0;
  return Math.round(((totalQuestions - unresolvedWrongCount) / totalQuestions) * 100);
}
