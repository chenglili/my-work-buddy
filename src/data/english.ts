import type { EnglishLesson } from "../types";

export const englishLessons = [
  {
    id: "english-greetings",
    title: "Hello, friends!",
    topic: "问候",
    words: [
      { english: "hello", chinese: "你好", example: "Hello, Amy!" },
      { english: "morning", chinese: "早晨", example: "Good morning!" },
      { english: "friend", chinese: "朋友", example: "This is my friend." },
      { english: "goodbye", chinese: "再见", example: "Goodbye, Tom!" },
    ],
    sentencePatterns: [
      { english: "Hello! I'm ___.", chinese: "你好！我是……" },
      { english: "How are you? I'm fine.", chinese: "你好吗？我很好。" },
    ],
    practice: ["大声读每个单词两遍", "用自己的名字完成自我介绍", "和家人完成一组问候对话"],
    rewardStars: 6,
  },
] satisfies EnglishLesson[];
