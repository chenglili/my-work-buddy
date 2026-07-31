import type {
  ChineseDictationSet,
  ChinesePrepItem,
  ChineseReadingItem,
  ReadingComprehension,
} from "../types";

export const chineseReadings = [
  {
    id: "reading-mei-hua",
    title: "梅花",
    author: "宋·王安石",
    sourceNote: "公版古诗",
    lines: ["墙角数枝梅，", "凌寒独自开。", "遥知不是雪，", "为有暗香来。"],
    readingTip: "读出梅花不怕寒冷、安静开放的感觉。",
    focus: ["凌寒", "遥知", "暗香"],
    rewardStars: 5,
  },
  {
    id: "reading-deng-guan-que-lou",
    title: "登鹳雀楼",
    author: "唐·王之涣",
    sourceNote: "公版古诗",
    lines: ["白日依山尽，", "黄河入海流。", "欲穷千里目，", "更上一层楼。"],
    readingTip: "前两句读得开阔，后两句读出向上攀登的力量。",
    focus: ["依", "尽", "欲穷"],
    rewardStars: 5,
  },
] satisfies ChineseReadingItem[];

export const chinesePrepLessons = [
  {
    id: "prep-autumn-campus",
    title: "秋天的校园",
    sourceNote: "原创短文",
    paragraphs: [
      "清晨，校园里吹来凉凉的风。银杏叶慢慢变黄，像一把把金色的小扇子。",
      "同学们捡起落叶，夹进书里做书签。操场边的桂花开了，空气里甜甜的。",
    ],
    vocabulary: [
      { text: "凉", pinyin: "liáng", word: "凉风" },
      { text: "银", pinyin: "yín", word: "银杏" },
      { text: "扇", pinyin: "shàn", word: "扇子" },
      { text: "桂", pinyin: "guì", word: "桂花" },
    ],
    prepTasks: ["朗读短文两遍", "圈出表示颜色的词", "说一说秋天的校园有什么变化"],
    rewardStars: 5,
  },
  {
    id: "prep-cloud-mailbox",
    title: "云朵信箱",
    sourceNote: "原创童话",
    paragraphs: [
      "小雨点住在云朵信箱里。风一吹，信箱轻轻摇晃，小雨点们就排好队出发。",
      "它们落在田野里，青菜抬起头；落在屋檐上，唱起滴答滴答的歌。",
    ],
    vocabulary: [
      { text: "箱", pinyin: "xiāng", word: "信箱" },
      { text: "晃", pinyin: "huàng", word: "摇晃" },
      { text: "檐", pinyin: "yán", word: "屋檐" },
      { text: "滴", pinyin: "dī", word: "雨滴" },
    ],
    prepTasks: ["标出自然段", "读准生字词", "找出小雨点落下的两个地方"],
    rewardStars: 5,
  },
] satisfies ChinesePrepItem[];

export const chineseDictationSets = [
  {
    id: "dictation-campus",
    title: "校园词语",
    words: [
      { text: "老师", pinyin: "lǎo shī", hint: "教我们学习的人" },
      { text: "同学", pinyin: "tóng xué", hint: "一起上课的小伙伴" },
      { text: "教室", pinyin: "jiào shì", hint: "上课的房间" },
      { text: "书包", pinyin: "shū bāo", hint: "装课本的包" },
      { text: "认真", pinyin: "rèn zhēn", hint: "专心、不马虎" },
      { text: "安静", pinyin: "ān jìng", hint: "没有吵闹声" },
    ],
    passScore: 5,
    rewardStars: 5,
  },
] satisfies ChineseDictationSet[];

export const readingComprehensions = [
  {
    id: "comprehension-pinecone-home",
    title: "小松果的新家",
    sourceNote: "原创短文",
    paragraphs: [
      "一颗小松果从树上掉下来，滚到了柔软的泥土里。冬天，它盖着白雪被子安静地睡觉。",
      "春天来了，雪化成水钻进泥土。小松果喝饱了水，慢慢长出一棵嫩绿的小苗。",
    ],
    questions: [
      {
        id: "pinecone-q1",
        type: "choice",
        prompt: "小松果最后变成了什么？",
        options: ["一朵花", "一棵小苗", "一块石头"],
        answer: "一棵小苗",
        explanation: "第二自然段写到它长出一棵嫩绿的小苗。",
      },
      {
        id: "pinecone-q2",
        type: "choice",
        prompt: "冬天，什么像小松果的被子？",
        options: ["白雪", "树叶", "泥土"],
        answer: "白雪",
        explanation: "文中说它盖着白雪被子睡觉。",
      },
      {
        id: "pinecone-q3",
        type: "short-answer",
        prompt: "春天来了，发生了哪两件事？",
        answer: "雪化成水钻进泥土，小松果长出了小苗。",
        explanation: "按第二自然段的先后顺序回答即可。",
      },
    ],
    rewardStars: 5,
  },
  {
    id: "comprehension-shared-umbrella",
    title: "一起撑伞",
    sourceNote: "原创短文",
    paragraphs: [
      "放学时下起了雨。明明带了伞，乐乐却没有。明明把伞往乐乐那边移了移，两个人肩并肩走。",
      "伞不大，他们的鞋子有点湿，心里却暖暖的。到了路口，乐乐笑着说：“明天我也要记得帮助别人。”",
    ],
    questions: [
      {
        id: "umbrella-q1",
        type: "choice",
        prompt: "谁没有带伞？",
        options: ["明明", "乐乐", "两个人都没带"],
        answer: "乐乐",
        explanation: "第一自然段直接说明乐乐没有带伞。",
      },
      {
        id: "umbrella-q2",
        type: "short-answer",
        prompt: "为什么他们心里暖暖的？",
        answer: "因为明明愿意和乐乐分享雨伞、互相帮助。",
        explanation: "结合明明把伞移向乐乐的动作来回答。",
      },
      {
        id: "umbrella-q3",
        type: "choice",
        prompt: "这篇短文最想告诉我们什么？",
        options: ["下雨要跑得快", "要爱护鞋子", "要互相帮助"],
        answer: "要互相帮助",
        explanation: "分享雨伞让乐乐也想继续帮助别人。",
      },
    ],
    rewardStars: 5,
  },
] satisfies ReadingComprehension[];
