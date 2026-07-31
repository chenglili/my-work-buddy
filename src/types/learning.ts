export type Subject = "chinese" | "math" | "english" | "activity";

export type TaskStatus = "pending" | "in-progress" | "completed";

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  durationMinutes: number;
  rewardStars: number;
  status: TaskStatus;
  progress: number;
  contentId: string;
}

export interface ChineseVocabulary {
  text: string;
  pinyin: string;
  word: string;
}

export interface ChineseReadingItem {
  id: string;
  title: string;
  author: string;
  sourceNote: string;
  lines: string[];
  readingTip: string;
  focus: string[];
  rewardStars: number;
}

export interface ChinesePrepItem {
  id: string;
  title: string;
  sourceNote: string;
  paragraphs: string[];
  vocabulary: ChineseVocabulary[];
  prepTasks: string[];
  rewardStars: number;
}

export interface DictationWord {
  text: string;
  pinyin: string;
  hint: string;
}

export interface ChineseDictationSet {
  id: string;
  title: string;
  words: DictationWord[];
  passScore: number;
  rewardStars: number;
}

export type ReadingQuestionType = "choice" | "short-answer";

export interface ReadingQuestion {
  id: string;
  type: ReadingQuestionType;
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface ReadingComprehension {
  id: string;
  title: string;
  sourceNote: string;
  paragraphs: string[];
  questions: ReadingQuestion[];
  rewardStars: number;
}

export type MathDifficulty = "基础" | "进阶" | "挑战";

export interface MathDrillExample {
  prompt: string;
  answer: string;
}

export interface MathDrill {
  id: string;
  title: string;
  skill: string;
  description: string;
  difficulty: MathDifficulty;
  questionCount: number;
  timeLimitMinutes: number;
  examples: MathDrillExample[];
  rewardStars: number;
}

export interface EnglishWord {
  english: string;
  chinese: string;
  example: string;
}

export interface EnglishSentencePattern {
  english: string;
  chinese: string;
}

export interface EnglishLesson {
  id: string;
  title: string;
  topic: string;
  words: EnglishWord[];
  sentencePatterns: EnglishSentencePattern[];
  practice: string[];
  rewardStars: number;
}

export interface LearningGame {
  id: string;
  title: string;
  subject: Subject;
  description: string;
  skill: string;
  durationMinutes: number;
  rewardStars: number;
  emoji: string;
}

export interface ExerciseActivity {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  steps: string[];
  safetyTip: string;
  rewardStars: number;
  emoji: string;
}

export type RewardCategory = "零食" | "玩具" | "娱乐";

export interface ShopReward {
  id: string;
  name: string;
  description: string;
  category: RewardCategory;
  costStars: number;
  emoji: string;
  available: boolean;
}

export type EncouragementTrigger =
  | "welcome"
  | "task-complete"
  | "daily-goal"
  | "streak"
  | "perfect"
  | "try-again";

export interface Encouragement {
  id: string;
  trigger: EncouragementTrigger;
  message: string;
}
