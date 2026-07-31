export type TaskCategory = "chinese" | "math" | "english" | "game" | "sport";
export type ViewKey = "home" | TaskCategory | "shop";

export interface TaskDefinition {
  id: string;
  category: TaskCategory;
  title: string;
  shortTitle: string;
  points: number;
  minutes: string;
  character: "hello-kitty" | "my-melody" | "kuromi" | "cinnamoroll";
  summary: string;
}

export const curriculumNote = "江苏适用：语文按统编版二年级上册预习，数学按苏教版二年级上册基础，英语只做低龄听读启蒙。";

export const taskCatalog: TaskDefinition[] = [
  {
    id: "chinese-morning-reading",
    category: "chinese",
    title: "每日晨读",
    shortTitle: "晨读",
    points: 5,
    minutes: "15-20分钟",
    character: "my-melody",
    summary: "古诗、二上课文片段和组词跟读，排除一年级已背篇目。",
  },
  {
    id: "chinese-preview-copybook",
    category: "chinese",
    title: "预习二上语文课本和同步字帖",
    shortTitle: "课文预习",
    points: 5,
    minutes: "15分钟",
    character: "hello-kitty",
    summary: "看课文片段、生字、笔顺提示和组词，再完成描红练字。",
  },
  {
    id: "chinese-memorize",
    category: "chinese",
    title: "二年级上册必背课本内容",
    shortTitle: "背诵闯关",
    points: 5,
    minutes: "10分钟",
    character: "cinnamoroll",
    summary: "日积月累、课内古诗和背诵段落分段闯关。",
  },
  {
    id: "chinese-dictation",
    category: "chinese",
    title: "听写二年级上册生字",
    shortTitle: "语音听写",
    points: 5,
    minutes: "10分钟",
    character: "kuromi",
    summary: "强制语音报生字，支持重复播放，全部完成后显示参考答案。",
  },
  {
    id: "chinese-night-reading",
    category: "chinese",
    title: "晚上晚读半小时",
    shortTitle: "晚读",
    points: 5,
    minutes: "30分钟",
    character: "my-melody",
    summary: "二年级短篇阅读，计时结束后打卡。",
  },
  {
    id: "chinese-picture-writing",
    category: "chinese",
    title: "看图写话练习",
    shortTitle: "看图写话",
    points: 5,
    minutes: "10分钟",
    character: "hello-kitty",
    summary: "根据简单情景、提示词写2-4句话，再看范文。",
  },
  {
    id: "chinese-reading-comprehension",
    category: "chinese",
    title: "阅读理解专项",
    shortTitle: "阅读理解",
    points: 5,
    minutes: "10分钟",
    character: "cinnamoroll",
    summary: "二年级短文，选择题和问答题，做完显示解析。",
  },
  {
    id: "math-arithmetic",
    category: "math",
    title: "口算小练习",
    shortTitle: "口算",
    points: 5,
    minutes: "12分钟",
    character: "kuromi",
    summary: "100以内加减法，每日自动生成60道，完成后核对答案。",
  },
  {
    id: "math-multiply-divide",
    category: "math",
    title: "乘除法练习",
    shortTitle: "乘除法",
    points: 5,
    minutes: "10分钟",
    character: "cinnamoroll",
    summary: "苏教版二上表内乘法口诀入门，配简单表内乘除题。",
  },
  {
    id: "math-word-problems",
    category: "math",
    title: "应用题练习",
    shortTitle: "应用题",
    points: 5,
    minutes: "12分钟",
    character: "hello-kitty",
    summary: "每日6道生活化图文应用题，只用二上基础。",
  },
  {
    id: "english-daily",
    category: "english",
    title: "英语每日听读任务",
    shortTitle: "英语听读",
    points: 6,
    minutes: "90分钟",
    character: "cinnamoroll",
    summary: "英文动画半小时，英语听读累计1小时以上，附简单短句跟读。",
  },
  {
    id: "game-hanzi",
    category: "game",
    title: "汉字闯关",
    shortTitle: "汉字闯关",
    points: 3,
    minutes: "5分钟",
    character: "my-melody",
    summary: "把词语分到人物、地点、动作三类。",
  },
  {
    id: "game-number",
    category: "game",
    title: "数字解谜",
    shortTitle: "数字解谜",
    points: 3,
    minutes: "5分钟",
    character: "kuromi",
    summary: "观察数字规律，选出下一步。",
  },
  {
    id: "game-spot",
    category: "game",
    title: "找不同",
    shortTitle: "找不同",
    points: 3,
    minutes: "5分钟",
    character: "hello-kitty",
    summary: "比较两组图案，找出不同项。",
  },
  {
    id: "game-logic",
    category: "game",
    title: "逻辑推理小游戏",
    shortTitle: "逻辑推理",
    points: 3,
    minutes: "5分钟",
    character: "cinnamoroll",
    summary: "根据线索判断顺序和对应关系。",
  },
  {
    id: "sport-rope",
    category: "sport",
    title: "跳绳打卡任务",
    shortTitle: "跳绳",
    points: 6,
    minutes: "目标500个",
    character: "kuromi",
    summary: "跳绳500个以上达标，家长确认后打卡。",
  },
  {
    id: "sport-high-jump",
    category: "sport",
    title: "摸高跳打卡任务",
    shortTitle: "摸高跳",
    points: 6,
    minutes: "目标200个",
    character: "hello-kitty",
    summary: "摸高跳200个以上达标，注意落地缓冲。",
  },
  {
    id: "sport-hour",
    category: "sport",
    title: "每日运动总目标",
    shortTitle: "运动1小时",
    points: 6,
    minutes: "60分钟",
    character: "my-melody",
    summary: "当天运动累计1小时以上，单独完成打卡。",
  },
];

export const requiredTaskIds = taskCatalog.map((task) => task.id);

export const sectionMeta: Record<ViewKey, { label: string; icon: string; character: TaskDefinition["character"] }> = {
  home: { label: "每日打卡", icon: "📋", character: "hello-kitty" },
  chinese: { label: "语文专区", icon: "📖", character: "my-melody" },
  math: { label: "数学专区", icon: "🧮", character: "kuromi" },
  english: { label: "英语专区", icon: "🌍", character: "cinnamoroll" },
  game: { label: "益智游戏", icon: "🎮", character: "kuromi" },
  sport: { label: "运动锻炼", icon: "🏃", character: "hello-kitty" },
  shop: { label: "积分商店", icon: "🛒", character: "my-melody" },
};

export const characterImages: Record<TaskDefinition["character"], string> = {
  "hello-kitty": "characters/hello-kitty.png",
  "my-melody": "characters/my-melody.png",
  kuromi: "characters/kuromi.png",
  cinnamoroll: "characters/cinnamoroll.png",
};

export const memorizationPassages = [
  "树无根不长，人无志不立。",
  "己所不欲，勿施于人。",
  "遥知不是雪，为有暗香来。",
  "欲穷千里目，更上一层楼。",
];

export const copybookWords = [
  { word: "园", pinyin: "yuan", strokes: "先外后内再封口", group: "校园、花园" },
  { word: "桥", pinyin: "qiao", strokes: "左窄右宽，木字旁写稳", group: "小桥、石桥" },
  { word: "队", pinyin: "dui", strokes: "左耳旁短小，右边撇捺舒展", group: "队伍、排队" },
  { word: "歌", pinyin: "ge", strokes: "左右结构，欠字旁最后写捺", group: "唱歌、儿歌" },
];

export const dictationWords = ["园", "桥", "队", "歌", "旗", "领", "忙", "苗", "柏", "深"];

export const wordProblems = [
  { prompt: "小雨有28张贴纸，送给同学9张，还剩多少张？", answer: "19张" },
  { prompt: "图书角原来有36本书，又放进12本，现在有多少本？", answer: "48本" },
  { prompt: "每排有4盆花，摆了3排，一共有多少盆？", answer: "12盆" },
  { prompt: "18个苹果平均放进3个盘子，每盘几个？", answer: "6个" },
  { prompt: "公交车上有45人，下车8人，上车6人，现在有多少人？", answer: "43人" },
  { prompt: "一根彩带长60厘米，剪去25厘米，还剩多少厘米？", answer: "35厘米" },
];

export const gameChallenges = {
  "game-hanzi": {
    question: "“教室”应该放进哪个篮子？",
    options: ["人物", "地点", "动作"],
    answer: "地点",
  },
  "game-number": {
    question: "2、4、6、8、？",
    options: ["9", "10", "12"],
    answer: "10",
  },
  "game-spot": {
    question: "Kitty、Kitty、Melody、Kitty 中哪一个不同？",
    options: ["第1个", "第3个", "第4个"],
    answer: "第3个",
  },
  "game-logic": {
    question: "小红比小明高，小明比小乐高，谁最高？",
    options: ["小红", "小明", "小乐"],
    answer: "小红",
  },
} as const;
