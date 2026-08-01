export type TaskCategory = "chinese" | "math" | "english" | "game" | "sport";
export type ViewKey = "home" | TaskCategory | "pet" | "shop";
export type TaskSchedule = "core" | "rotation" | "optional";
export type CompletionMode = "auto" | "timer" | "parent";

export interface TaskDefinition {
  id: string;
  category: TaskCategory;
  title: string;
  shortTitle: string;
  points: number;
  minutes: string;
  character: "hello-kitty" | "my-melody" | "kuromi" | "cinnamoroll";
  summary: string;
  schedule: TaskSchedule;
  completionMode: CompletionMode;
  minimumScore?: number;
  minimumDuration?: number;
  requiresParent: boolean;
}

export const curriculumNote = "江苏适用：语文按统编版二年级上册预习，数学按苏教版二年级上册基础，英语按译林版二年级上册主题预习。";

const baseTaskCatalog: Omit<TaskDefinition, "schedule" | "completionMode" | "minimumScore" | "minimumDuration" | "requiresParent">[] = [
  {
    id: "chinese-morning-reading",
    category: "chinese",
    title: "每日晨读",
    shortTitle: "晨读",
    points: 5,
    minutes: "自主安排",
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
    title: "晚上晚读",
    shortTitle: "晚读",
    points: 5,
    minutes: "自主安排",
    character: "my-melody",
    summary: "二年级短篇阅读，读完后由孩子自主完成打卡。",
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
    summary: "100以内正整数加减法，每日20道，答错后专项重练。",
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
    minutes: "15分钟",
    character: "cinnamoroll",
    summary: "每日15分钟译林版二上主题听读，包含单词、核心句型和跟读任务。",
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
    minutes: "20分钟",
    character: "kuromi",
    summary: "跳绳500个以上达标，家长确认后打卡。",
  },
  {
    id: "sport-high-jump",
    category: "sport",
    title: "摸高跳打卡任务",
    shortTitle: "摸高跳",
    points: 6,
    minutes: "20分钟",
    character: "hello-kitty",
    summary: "摸高跳100个以上达标，注意落地缓冲。",
  },
  {
    id: "sport-hour",
    category: "sport",
    title: "每日运动总目标",
    shortTitle: "运动1小时",
    points: 6,
    minutes: "20分钟",
    character: "my-melody",
    summary: "当天运动累计1小时以上，单独完成打卡。",
  },
];

const taskRules: Record<string, Pick<TaskDefinition, "schedule" | "completionMode" | "minimumScore" | "minimumDuration" | "requiresParent">> = {
  "chinese-morning-reading": { schedule: "core", completionMode: "auto", minimumScore: 0, requiresParent: false },
  "chinese-preview-copybook": { schedule: "rotation", completionMode: "parent", requiresParent: true },
  "chinese-memorize": { schedule: "rotation", completionMode: "parent", requiresParent: true },
  "chinese-dictation": { schedule: "rotation", completionMode: "parent", requiresParent: true },
  "chinese-night-reading": { schedule: "core", completionMode: "auto", minimumScore: 0, requiresParent: false },
  "chinese-picture-writing": { schedule: "rotation", completionMode: "parent", requiresParent: true },
  "chinese-reading-comprehension": { schedule: "rotation", completionMode: "auto", minimumScore: 80, requiresParent: false },
  "math-arithmetic": { schedule: "core", completionMode: "auto", minimumScore: 80, requiresParent: false },
  "math-multiply-divide": { schedule: "rotation", completionMode: "auto", minimumScore: 80, requiresParent: false },
  "math-word-problems": { schedule: "rotation", completionMode: "auto", minimumScore: 80, requiresParent: false },
  "english-daily": { schedule: "core", completionMode: "auto", minimumScore: 0, requiresParent: false },
  "game-hanzi": { schedule: "optional", completionMode: "auto", minimumScore: 0, requiresParent: false },
  "game-number": { schedule: "optional", completionMode: "auto", minimumScore: 0, requiresParent: false },
  "game-spot": { schedule: "optional", completionMode: "auto", minimumScore: 0, requiresParent: false },
  "game-logic": { schedule: "optional", completionMode: "auto", minimumScore: 0, requiresParent: false },
  "sport-rope": { schedule: "core", completionMode: "parent", requiresParent: true },
  "sport-high-jump": { schedule: "core", completionMode: "parent", requiresParent: true },
  "sport-hour": { schedule: "core", completionMode: "parent", requiresParent: true },
};

export const taskCatalog: TaskDefinition[] = baseTaskCatalog.map((task) => ({ ...task, ...taskRules[task.id] })).map((task) => task.id === "english-daily"
  ? { ...task, minutes: "鑷富瀹夋帓", summary: "璇戞灄鐗堜簩涓婁富棰樺惉璇伙紝鍖呭惈鍗曡瘝銆佹牳蹇冨彞鍨嬪拰璺熻浠诲姟锛屾寜鑷繁鐨勮妭濂忓畨鎺掋€?" }
  : task);

const rotatingTaskIds = [
  "chinese-preview-copybook",
  "math-multiply-divide",
  "chinese-dictation",
  "chinese-reading-comprehension",
  "chinese-picture-writing",
  "math-word-problems",
  "chinese-memorize",
];

const sportTaskIds = ["sport-rope", "sport-high-jump", "sport-hour"];

const dayNumber = (value: Date) => Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86400000);

const augustUnits = [
  { start: 1, end: 4 },
  { start: 5, end: 8 },
  { start: 9, end: 12 },
  { start: 13, end: 16 },
  { start: 17, end: 20 },
  { start: 21, end: 24 },
  { start: 25, end: 27 },
  { start: 28, end: 31 },
];

const stageLabels = ["认识新内容", "听读与理解", "练习与运用", "小复习闯关"];

export const getStudySchedule = (value = new Date()) => {
  if (value.getMonth() === 7) {
    const day = value.getDate();
    const unitIndex = augustUnits.findIndex((unit) => day >= unit.start && day <= unit.end);
    const safeIndex = unitIndex < 0 ? 0 : unitIndex;
    const unit = augustUnits[safeIndex];
    const dayInUnit = Math.max(0, day - unit.start);
    const length = unit.end - unit.start + 1;
    const stageLabel = length === 3
      ? [stageLabels[0], "听读与练习", stageLabels[3]][dayInUnit]
      : stageLabels[dayInUnit];
    const schoolDate = new Date(value.getFullYear(), 8, 1);
    return {
      unitIndex: safeIndex,
      dayInUnit,
      stageLabel,
      dateRange: `8月${unit.start}日–${unit.end}日`,
      daysUntilSchool: Math.max(1, Math.ceil((schoolDate.getTime() - value.getTime()) / 86400000)),
      isSummerPlan: true,
    };
  }

  if (value.getMonth() === 8 && value.getDate() === 1) {
    return { unitIndex: 7, dayInUnit: 3, stageLabel: "开学回顾", dateRange: "9月1日", daysUntilSchool: 0, isSummerPlan: true };
  }

  const unitIndex = Math.floor(dayNumber(value) / 7) % 8;
  return { unitIndex, dayInUnit: value.getDay(), stageLabel: stageLabels[value.getDay() % stageLabels.length], dateRange: `第${unitIndex + 1}周`, daysUntilSchool: 0, isSummerPlan: false };
};

const augustRotationPlan = [
  ["chinese-preview-copybook", "chinese-dictation", "chinese-reading-comprehension", "chinese-memorize"],
  ["chinese-preview-copybook", "math-multiply-divide", "chinese-reading-comprehension", "chinese-picture-writing"],
  ["chinese-preview-copybook", "chinese-dictation", "math-word-problems", "chinese-memorize"],
  ["chinese-preview-copybook", "math-multiply-divide", "chinese-reading-comprehension", "chinese-picture-writing"],
  ["chinese-preview-copybook", "chinese-dictation", "math-word-problems", "chinese-memorize"],
  ["chinese-preview-copybook", "math-multiply-divide", "chinese-reading-comprehension", "chinese-picture-writing"],
  ["chinese-preview-copybook", "chinese-dictation", "math-word-problems"],
  ["chinese-preview-copybook", "math-multiply-divide", "chinese-reading-comprehension", "chinese-memorize"],
];

export const getDailyTaskIds = (value = new Date()) => {
  const sportId = sportTaskIds[dayNumber(value) % sportTaskIds.length];
  const common = ["chinese-morning-reading", "math-arithmetic", "english-daily", "chinese-night-reading", sportId];
  if (value.getDay() === 0) return common.filter((id) => id !== "math-arithmetic");
  const schedule = getStudySchedule(value);
  if (schedule.isSummerPlan && value.getMonth() === 7) {
    const unitTasks = augustRotationPlan[schedule.unitIndex];
    return [...common, unitTasks[schedule.dayInUnit % unitTasks.length]];
  }
  return [...common, rotatingTaskIds[dayNumber(value) % rotatingTaskIds.length]];
};

export const optionalTaskIds = taskCatalog.filter((task) => task.schedule === "optional").map((task) => task.id);

export const sectionMeta: Record<ViewKey, { label: string; mobileLabel: string; character: TaskDefinition["character"]; navIcon: string }> = {
  home: { label: "每日打卡", mobileLabel: "首页", character: "hello-kitty", navIcon: "characters/hello-kitty.png" },
  chinese: { label: "语文专区", mobileLabel: "语文", character: "my-melody", navIcon: "characters/my-melody.png" },
  math: { label: "数学专区", mobileLabel: "数学", character: "kuromi", navIcon: "characters/kuromi.png" },
  english: { label: "英语专区", mobileLabel: "英语", character: "cinnamoroll", navIcon: "characters/cinnamoroll.png" },
  game: { label: "益智游戏", mobileLabel: "游戏", character: "kuromi", navIcon: "characters/keroppi.svg" },
  sport: { label: "运动锻炼", mobileLabel: "运动", character: "hello-kitty", navIcon: "characters/pochacco.svg" },
  pet: { label: "嘟嘟小屋", mobileLabel: "宠物", character: "hello-kitty", navIcon: "pets/sun-conure-avatar-256.webp" },
  shop: { label: "积分商店", mobileLabel: "商店", character: "my-melody", navIcon: "characters/pompompurin.svg" },
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

export interface WeeklyContent {
  theme: string;
  readingTitle: string;
  readingText: string;
  words: Array<{ word: string; pinyin: string; strokes: string; group: string }>;
  dictation: string[];
  memorization: string[];
  picture: { title: string; scene: string; hints: string; example: string };
  english: {
    unit: string;
    title: string;
    topic: string;
    words: Array<{ word: string; meaning: string; sentence: string }>;
    patterns: Array<{ sentence: string; meaning: string }>;
    chant: string;
    tasks: string[];
  };
}

export const weeklyContent: WeeklyContent[] = [
  {
    theme: "校园新生活",
    readingTitle: "清晨的校园",
    readingText: "清晨，校园里吹来凉凉的风。银杏叶像金色的小扇子，同学们背着书包，笑着走进教室。",
    words: [
      { word: "园", pinyin: "yuán", strokes: "先外后内再封口", group: "校园、花园" },
      { word: "队", pinyin: "duì", strokes: "左窄右宽，撇捺舒展", group: "队伍、排队" },
      { word: "旗", pinyin: "qí", strokes: "左右结构，方字旁写窄", group: "国旗、红旗" },
      { word: "歌", pinyin: "gē", strokes: "左右结构，最后写捺", group: "唱歌、儿歌" },
    ],
    dictation: ["校园", "队伍", "国旗", "唱歌", "老师", "同学", "认真", "安静"],
    memorization: ["树无根不长，人无志不立。", "欲穷千里目，更上一层楼。"],
    picture: { title: "快乐课间", scene: "🏫　👧　🪁　🌳", hints: "操场、同学、游戏、开心", example: "下课了，同学们来到操场上。有的跳绳，有的放风筝，大家玩得很开心。" },
    english: {
      unit: "Unit 1",
      title: "She's my aunt",
      topic: "介绍家人",
      words: [
        { word: "aunt", meaning: "姑母；姨母；伯母；舅母", sentence: "She's my aunt." },
        { word: "uncle", meaning: "叔叔；伯伯；舅舅；姑父", sentence: "He's my uncle." },
        { word: "cousin", meaning: "堂（表）兄弟姐妹", sentence: "She's my cousin." },
        { word: "family", meaning: "家人；家庭", sentence: "This is my family." },
        { word: "brother", meaning: "哥哥；弟弟", sentence: "He's my brother." },
        { word: "sister", meaning: "姐姐；妹妹", sentence: "She's my sister." },
      ],
      patterns: [
        { sentence: "Who's she? She's my aunt.", meaning: "她是谁？她是我的姨妈。" },
        { sentence: "Who's he? He's my uncle.", meaning: "他是谁？他是我的叔叔。" },
        { sentence: "This is my family.", meaning: "这是我的家人。" },
      ],
      chant: "Aunt and uncle, sister and brother. We are a happy family.",
      tasks: ["听读6个家庭成员词语", "完成听音辨词", "拼好一个介绍家人的句子", "指着家庭照片介绍一位家人"],
    },
  },
  {
    theme: "秋天来了",
    readingTitle: "秋天的颜色",
    readingText: "秋风轻轻吹，稻田变成金黄色，枫叶换上红衣裳。果园里，苹果露出了圆圆的笑脸。",
    words: [
      { word: "秋", pinyin: "qiū", strokes: "左右结构，禾木旁略窄", group: "秋天、秋风" },
      { word: "黄", pinyin: "huáng", strokes: "横画均匀，中间写紧凑", group: "黄色、金黄" },
      { word: "叶", pinyin: "yè", strokes: "口字旁小，十字舒展", group: "树叶、叶子" },
      { word: "果", pinyin: "guǒ", strokes: "先写日，再写木", group: "水果、果园" },
    ],
    dictation: ["秋风", "黄色", "树叶", "果园", "苹果", "稻田", "枫叶", "金色"],
    memorization: ["一场秋雨一场寒，十场秋雨要穿棉。", "墙角数枝梅，凌寒独自开。"],
    picture: { title: "秋游", scene: "🍁　🧺　👧　🍎", hints: "秋天、果园、篮子、丰收", example: "秋天到了，我们去果园秋游。树上挂着红红的苹果，大家把果子轻轻放进篮子里。" },
    english: {
      unit: "Unit 2",
      title: "I have a rabbit",
      topic: "介绍宠物",
      words: [
        { word: "rabbit", meaning: "兔子", sentence: "I have a rabbit." },
        { word: "dog", meaning: "狗", sentence: "I have a dog." },
        { word: "cat", meaning: "猫", sentence: "I have a cat." },
        { word: "hamster", meaning: "仓鼠", sentence: "I have a hamster." },
        { word: "bird", meaning: "鸟", sentence: "I have a bird." },
        { word: "fish", meaning: "鱼", sentence: "I have a fish." },
      ],
      patterns: [
        { sentence: "I have a rabbit.", meaning: "我有一只兔子。" },
        { sentence: "It's cute.", meaning: "它很可爱。" },
        { sentence: "This is my pet.", meaning: "这是我的宠物。" },
      ],
      chant: "A rabbit, a cat, a bird and a dog. I love my little pet.",
      tasks: ["听音辨认6种宠物", "完成听音辨词", "拼好一个介绍宠物的句子", "选择一种宠物说I have..."],
    },
  },
  {
    theme: "动物朋友",
    readingTitle: "小松鼠存松果",
    readingText: "小松鼠在树林里找到许多松果。它把松果一个个搬回树洞，准备在寒冷的冬天慢慢享用。",
    words: [
      { word: "松", pinyin: "sōng", strokes: "木字旁窄，公字舒展", group: "松树、松果" },
      { word: "熊", pinyin: "xióng", strokes: "上紧下宽，四点底均匀", group: "熊猫、小熊" },
      { word: "猫", pinyin: "māo", strokes: "反犬旁窄，右边写稳", group: "小猫、花猫" },
      { word: "洞", pinyin: "dòng", strokes: "三点水呈弧形", group: "山洞、树洞" },
    ],
    dictation: ["松树", "松果", "熊猫", "小猫", "树洞", "树林", "动物", "朋友"],
    memorization: ["己所不欲，勿施于人。", "与朋友交，言而有信。"],
    picture: { title: "帮助小鸟", scene: "🐦　🌳　👧　🪺", hints: "小鸟、树下、鸟窝、帮助", example: "一只小鸟从窝里掉了下来。小朋友请大人帮忙，把它安全地送回鸟窝。" },
    english: {
      unit: "Unit 3",
      title: "It has a short tail",
      topic: "描述动物外形",
      words: [
        { word: "tail", meaning: "尾巴", sentence: "It has a short tail." },
        { word: "ear", meaning: "耳朵", sentence: "It has long ears." },
        { word: "long", meaning: "长的", sentence: "Its ears are long." },
        { word: "short", meaning: "短的；矮的", sentence: "Its tail is short." },
        { word: "eye", meaning: "眼睛", sentence: "It has big eyes." },
        { word: "nose", meaning: "鼻子", sentence: "It has a small nose." },
      ],
      patterns: [
        { sentence: "It has a short tail.", meaning: "它有一条短尾巴。" },
        { sentence: "It has long ears.", meaning: "它有长耳朵。" },
        { sentence: "It has big eyes.", meaning: "它有一双大眼睛。" },
      ],
      chant: "Long ears, big eyes, a short tail. Look at my cute animal friend.",
      tasks: ["边听边指出动物身体部位", "完成听音辨词", "拼好一个It has...句子", "用long或short描述动物"],
    },
  },
  {
    theme: "美丽家乡",
    readingTitle: "小桥流水",
    readingText: "家乡有一座弯弯的小桥，桥下的河水清清的。早晨，白鹭站在浅水里，安静地寻找小鱼。",
    words: [
      { word: "桥", pinyin: "qiáo", strokes: "左窄右宽，乔字写紧凑", group: "小桥、石桥" },
      { word: "河", pinyin: "hé", strokes: "三点水呈弧形，可字写正", group: "河水、小河" },
      { word: "乡", pinyin: "xiāng", strokes: "两个撇折方向一致", group: "家乡、乡村" },
      { word: "船", pinyin: "chuán", strokes: "舟字旁窄，右边上下对正", group: "小船、船只" },
    ],
    dictation: ["小桥", "河水", "家乡", "小船", "清晨", "白鹭", "寻找", "美丽"],
    memorization: ["白日依山尽，黄河入海流。", "有山皆图画，无水不文章。"],
    picture: { title: "河边散步", scene: "🌉　🛶　🌿　👨‍👩‍👧", hints: "傍晚、小桥、河边、散步", example: "傍晚，我们一家沿着河边散步。小船慢慢划过桥洞，晚风吹来很舒服。" },
    english: {
      unit: "Unit 4",
      title: "Autumn",
      topic: "感受秋天",
      words: [
        { word: "autumn", meaning: "秋天", sentence: "It's autumn." },
        { word: "cool", meaning: "凉爽的", sentence: "It's cool." },
        { word: "yellow", meaning: "黄色的", sentence: "The leaves are yellow." },
        { word: "orange", meaning: "橙色的；橙子", sentence: "I see an orange leaf." },
        { word: "red", meaning: "红色的", sentence: "I see a red leaf." },
        { word: "leaf", meaning: "树叶", sentence: "This leaf is yellow." },
      ],
      patterns: [
        { sentence: "It's cool in autumn.", meaning: "秋天天气凉爽。" },
        { sentence: "The leaves are yellow.", meaning: "树叶是黄色的。" },
        { sentence: "I see a red leaf.", meaning: "我看见一片红色的树叶。" },
      ],
      chant: "Red and yellow, orange too. Autumn leaves are falling down.",
      tasks: ["听读秋天和颜色词语", "完成听音辨词", "拼好一个秋天句子", "观察窗外说一种秋天颜色"],
    },
  },
  {
    theme: "冬日童话",
    readingTitle: "第一场雪",
    readingText: "雪花从天空慢慢飘下来，屋顶和树枝都变白了。孩子们戴上手套，在雪地里留下了一串串脚印。",
    words: [
      { word: "雪", pinyin: "xuě", strokes: "雨字头写宽，下面写紧凑", group: "下雪、雪花" },
      { word: "冬", pinyin: "dōng", strokes: "撇捺舒展，两点上下对齐", group: "冬天、冬日" },
      { word: "冷", pinyin: "lěng", strokes: "两点水短小，令字写正", group: "寒冷、冷风" },
      { word: "脚", pinyin: "jiǎo", strokes: "左中右结构要紧凑", group: "脚印、手脚" },
    ],
    dictation: ["雪花", "冬天", "寒冷", "脚印", "屋顶", "树枝", "手套", "天空"],
    memorization: ["遥知不是雪，为有暗香来。", "天苍苍，野茫茫，风吹草低见牛羊。"],
    picture: { title: "堆雪人", scene: "⛄　❄️　🧣　👧", hints: "雪地、雪球、围巾、合作", example: "雪停了，我和朋友一起堆雪人。我们给雪人戴上围巾，还用胡萝卜做鼻子。" },
    english: {
      unit: "Unit 5",
      title: "Have some juice, please!",
      topic: "分享食物和饮料",
      words: [
        { word: "juice", meaning: "果汁", sentence: "Have some juice, please." },
        { word: "milk", meaning: "牛奶", sentence: "Have some milk, please." },
        { word: "water", meaning: "水", sentence: "Have some water, please." },
        { word: "cake", meaning: "蛋糕", sentence: "Have some cake, please." },
        { word: "pie", meaning: "馅饼", sentence: "Have a pie, please." },
        { word: "sweet", meaning: "糖果", sentence: "Have a sweet, please." },
      ],
      patterns: [
        { sentence: "Have some juice, please.", meaning: "请喝一些果汁。" },
        { sentence: "Thank you.", meaning: "谢谢你。" },
        { sentence: "Have a cake, please.", meaning: "请吃一块蛋糕。" },
      ],
      chant: "Juice and milk, cake and pie. Have some, please. Thank you!",
      tasks: ["听音选择食物或饮料", "完成听音辨词", "拼好一个分享食物的句子", "和家长练习请别人品尝"],
    },
  },
  {
    theme: "我爱劳动",
    readingTitle: "整理小能手",
    readingText: "写完作业，小文把铅笔放进笔袋，把书本分层摆好，还擦干净了自己的小书桌。",
    words: [
      { word: "劳", pinyin: "láo", strokes: "上中下结构，横钩写稳", group: "劳动、辛劳" },
      { word: "桌", pinyin: "zhuō", strokes: "上窄下宽，木字托住上部", group: "书桌、桌子" },
      { word: "整", pinyin: "zhěng", strokes: "上下对正，正字写稳", group: "整理、整齐" },
      { word: "净", pinyin: "jìng", strokes: "两点水短，争字末笔出钩", group: "干净、洁净" },
    ],
    dictation: ["劳动", "书桌", "整理", "干净", "铅笔", "书本", "整齐", "自己"],
    memorization: ["不以规矩，不能成方圆。", "一粥一饭，当思来处不易。"],
    picture: { title: "一起做家务", scene: "🧹　🪣　👧　🏠", hints: "周末、扫地、整理、分工", example: "周末，我和爸爸妈妈一起做家务。我负责扫地和整理玩具，家里很快变得干干净净。" },
    english: {
      unit: "Unit 6",
      title: "We like our school",
      topic: "认识校园",
      words: [
        { word: "school", meaning: "学校", sentence: "We like our school." },
        { word: "classroom", meaning: "教室", sentence: "This is our classroom." },
        { word: "playground", meaning: "操场", sentence: "This is our playground." },
        { word: "library", meaning: "图书馆", sentence: "I like the library." },
        { word: "teacher", meaning: "老师", sentence: "This is our teacher." },
        { word: "friend", meaning: "朋友", sentence: "This is my friend." },
      ],
      patterns: [
        { sentence: "This is our school.", meaning: "这是我们的学校。" },
        { sentence: "We like our school.", meaning: "我们喜欢我们的学校。" },
        { sentence: "I like the library.", meaning: "我喜欢图书馆。" },
      ],
      chant: "Classroom, playground, library. We like our happy school.",
      tasks: ["听读校园人物和地点", "完成听音辨词", "拼好一个介绍校园的句子", "说一说最喜欢的校园地点"],
    },
  },
  {
    theme: "科学发现",
    readingTitle: "影子去哪儿",
    readingText: "早晨，影子长长的；中午，影子变短了。原来太阳在天空中的位置不同，影子的方向和长短也会变化。",
    words: [
      { word: "影", pinyin: "yǐng", strokes: "左右结构，三撇方向一致", group: "影子、电影" },
      { word: "观", pinyin: "guān", strokes: "左右等高，见字竖弯钩舒展", group: "观察、观看" },
      { word: "变", pinyin: "biàn", strokes: "上紧下松，反文写舒展", group: "变化、变成" },
      { word: "方", pinyin: "fāng", strokes: "点在竖中线，横折钩有力", group: "方向、方法" },
    ],
    dictation: ["影子", "观察", "变化", "方向", "早晨", "中午", "太阳", "发现"],
    memorization: ["读书百遍，而义自见。", "书籍是人类进步的阶梯。"],
    picture: { title: "观察影子", scene: "☀️　👧　📏　🌳", hints: "太阳、影子、长短、记录", example: "我在操场上观察影子。早晨和中午的影子长短不同，我把发现认真记了下来。" },
    english: {
      unit: "Unit 7",
      title: "Let's clean up!",
      topic: "一起整理",
      words: [
        { word: "clean", meaning: "打扫；干净的", sentence: "Let's clean up." },
        { word: "desk", meaning: "课桌", sentence: "Clean the desk, please." },
        { word: "chair", meaning: "椅子", sentence: "Clean the chair, please." },
        { word: "floor", meaning: "地面", sentence: "The floor is clean." },
        { word: "door", meaning: "门", sentence: "Clean the door, please." },
        { word: "window", meaning: "窗户", sentence: "Clean the window, please." },
      ],
      patterns: [
        { sentence: "Let's clean up!", meaning: "我们一起打扫吧！" },
        { sentence: "Clean the desk, please.", meaning: "请擦干净课桌。" },
        { sentence: "The floor is clean.", meaning: "地面很干净。" },
      ],
      chant: "Desk and chair, door and floor. Let's clean up together.",
      tasks: ["听指令指出教室物品", "完成听音辨词", "拼好一个整理指令", "边整理书桌边说一个英语指令"],
    },
  },
  {
    theme: "快乐成长",
    readingTitle: "我的小目标",
    readingText: "新的一周开始了，我给自己定下一个小目标：认真读书，按时运动，每天比昨天进步一点点。",
    words: [
      { word: "目", pinyin: "mù", strokes: "先外后内再封口，横画均匀", group: "目标、目光" },
      { word: "标", pinyin: "biāo", strokes: "左窄右宽，示字两点呼应", group: "目标、标准" },
      { word: "进", pinyin: "jìn", strokes: "先写井，后写走之", group: "进步、前进" },
      { word: "步", pinyin: "bù", strokes: "上下对正，最后一撇舒展", group: "进步、脚步" },
    ],
    dictation: ["目标", "标准", "进步", "脚步", "认真", "坚持", "运动", "成长"],
    memorization: ["千里之行，始于足下。", "路虽远，行则将至。"],
    picture: { title: "我的进步", scene: "📚　⭐　🏃　👧", hints: "目标、练习、坚持、进步", example: "我给自己定下一个小目标。每天认真练习并坚持运动，我发现自己越来越有信心。" },
    english: {
      unit: "Unit 8",
      title: "My dad is a doctor",
      topic: "介绍职业",
      words: [
        { word: "doctor", meaning: "医生", sentence: "My dad is a doctor." },
        { word: "nurse", meaning: "护士", sentence: "My mum is a nurse." },
        { word: "teacher", meaning: "老师", sentence: "She's a teacher." },
        { word: "cook", meaning: "厨师", sentence: "He's a cook." },
        { word: "farmer", meaning: "农民", sentence: "He's a farmer." },
        { word: "driver", meaning: "司机", sentence: "She's a driver." },
      ],
      patterns: [
        { sentence: "My dad is a doctor.", meaning: "我的爸爸是一名医生。" },
        { sentence: "What is he? He's a cook.", meaning: "他是做什么工作的？他是一名厨师。" },
        { sentence: "What is she? She's a teacher.", meaning: "她是做什么工作的？她是一名老师。" },
      ],
      chant: "Doctor, nurse, teacher, cook. Every job can help us all.",
      tasks: ["听读6种职业", "完成听音辨词", "拼好一个职业问答句", "用My...is a...介绍家人"],
    },
  },
];

export const getWeeklyContent = (value = new Date()) => weeklyContent[getStudySchedule(value).unitIndex % weeklyContent.length];

const problemObjects = [
  { item: "贴纸", unit: "张" },
  { item: "彩笔", unit: "支" },
  { item: "贝壳", unit: "个" },
  { item: "积木", unit: "块" },
  { item: "卡片", unit: "张" },
  { item: "气球", unit: "个" },
  { item: "书签", unit: "枚" },
  { item: "小花", unit: "朵" },
  { item: "糖果", unit: "颗" },
  { item: "纽扣", unit: "颗" },
];

export interface WordProblem {
  prompt: string;
  left: number;
  operator: "+" | "-" | "×" | "÷";
  right: number;
  result: number;
  unit: string;
  answer: string;
}

function makeWordProblem(prompt: string, left: number, operator: WordProblem["operator"], right: number, result: number, unit: string): WordProblem {
  return { prompt, left, operator, right, result, unit, answer: `${left}${operator}${right}=${result}（${unit}）` };
}

export function wordProblemAnswerMatches(input: string, problem: WordProblem) {
  const normalized = input.trim().replace(/\s/g, "").replace(/[xX*]/g, "×").replace(/\//g, "÷").replace(/[()（）]/g, "");
  const match = normalized.match(/^(\d+)([+\-×÷])(\d+)=(\d+)([\u4e00-\u9fff]+)$/);
  if (!match) return false;
  const [, rawLeft, operator, rawRight, rawResult, unit] = match;
  const left = Number(rawLeft);
  const right = Number(rawRight);
  const sameOrder = left === problem.left && right === problem.right;
  const reversedOrder = (problem.operator === "+" || problem.operator === "×") && left === problem.right && right === problem.left;
  return operator === problem.operator && (sameOrder || reversedOrder) && Number(rawResult) === problem.result && unit === problem.unit;
}

export const wordProblems = Array.from({ length: 40 }, (_, index) => {
  const { item, unit } = problemObjects[index % problemObjects.length];
  const group = Math.floor(index / 10);
  const offset = index % 10;
  if (group === 0) {
    const first = 18 + offset * 3;
    const second = 7 + (offset % 5) * 2;
    return makeWordProblem(`盒子里有${first}${unit}${item}，又放进${second}${unit}，现在一共有多少${unit}？`, first, "+", second, first + second, unit);
  }
  if (group === 1) {
    const total = 48 + offset * 4;
    const used = 9 + (offset % 6) * 3;
    return makeWordProblem(`手工课准备了${total}${unit}${item}，用掉${used}${unit}，还剩多少${unit}？`, total, "-", used, total - used, unit);
  }
  if (group === 2) {
    const rows = 2 + (offset % 5);
    const each = 2 + (offset % 6);
    return makeWordProblem(`每排摆${each}${unit}${item}，一共摆了${rows}排，共有多少${unit}？`, each, "×", rows, rows * each, unit);
  }
  const plates = 2 + (offset % 5);
  const each = 2 + (offset % 6);
  return makeWordProblem(`把${plates * each}${unit}${item}平均放进${plates}个盒子，每个盒子放多少${unit}？`, plates * each, "÷", plates, each, unit);
});

interface GameChallengeBase {
  question: string;
  answer: string;
}

export interface ClassifyGameChallenge extends GameChallengeBase {
  kind: "classify";
  item: string;
  baskets: string[];
}

export interface NumberPathGameChallenge extends GameChallengeBase {
  kind: "number-path";
  path: Array<number | null>;
  options: number[];
}

export interface SpotGameChallenge extends GameChallengeBase {
  kind: "spot";
  tiles: string[];
}

export interface OrderGameChallenge extends GameChallengeBase {
  kind: "order";
  cards: string[];
  correctOrder: string[];
}

export type GameChallenge = ClassifyGameChallenge | NumberPathGameChallenge | SpotGameChallenge | OrderGameChallenge;

const hanziItems = [
  ["老师", "人物"], ["同学", "人物"], ["妈妈", "人物"], ["爸爸", "人物"], ["医生", "人物"],
  ["妹妹", "人物"], ["哥哥", "人物"], ["爷爷", "人物"], ["奶奶", "人物"], ["护士", "人物"],
  ["司机", "人物"], ["厨师", "人物"], ["校长", "人物"], ["教室", "地点"], ["公园", "地点"], ["操场", "地点"],
  ["图书馆", "地点"], ["学校", "地点"], ["车站", "地点"], ["医院", "地点"], ["商店", "地点"],
  ["食堂", "地点"], ["花园", "地点"], ["家里", "地点"], ["邮局", "地点"], ["跑步", "动作"], ["写字", "动作"],
  ["唱歌", "动作"], ["跳绳", "动作"], ["读书", "动作"], ["画画", "动作"], ["整理", "动作"],
  ["洗手", "动作"], ["拍球", "动作"], ["听讲", "动作"], ["浇花", "动作"], ["扫地", "动作"],
  ["鼓掌", "动作"], ["排队", "动作"], ["起床", "动作"],
] as const;

const names = ["小雨", "乐乐", "安安", "甜甜", "朵朵", "晨晨", "果果", "米米", "可可", "宁宁"];
const spotPairs = [
  ["🌸", "🌼"], ["⭐", "🌟"], ["🍎", "🍅"], ["🐰", "🐱"], ["🎈", "🍭"],
  ["🍓", "🍒"], ["☀️", "🌙"], ["🎀", "🎁"], ["🐶", "🐻"], ["🌈", "☁️"],
] as const;

export const gameQuestionBanks: Record<string, GameChallenge[]> = {
  "game-hanzi": hanziItems.map(([word, answer]) => ({ kind: "classify", question: `把“${word}”放进正确的篮子`, item: word, baskets: ["人物", "地点", "动作"], answer })),
  "game-number": Array.from({ length: 40 }, (_, index) => {
    const start = 1 + (index % 8);
    const step = 2 + Math.floor(index / 8);
    const answer = start + step * 4;
    return { kind: "number-path", question: `从${start}出发，沿着每次加${step}的路线找到下一站`, path: [start, start + step, start + step * 2, start + step * 3, null], options: [answer - 1, answer, answer + step], answer: String(answer) };
  }),
  "game-spot": Array.from({ length: 40 }, (_, index) => {
    const [same, different] = spotPairs[index % spotPairs.length];
    const position = (index * 2 + Math.floor(index / spotPairs.length)) % 9;
    const tiles = Array.from({ length: 9 }, (_, tileIndex) => tileIndex === position ? different : same);
    return { kind: "spot", question: `九宫格第${index + 1}关：找出不同的图案`, tiles, answer: String(position) };
  }),
  "game-logic": Array.from({ length: 40 }, (_, index) => {
    const offset = index % names.length;
    const first = names[offset];
    const second = names[(offset + 1) % names.length];
    const third = names[(offset + 2) % names.length];
    const group = Math.floor(index / names.length);
    const correctOrder = [first, second, third];
    const cards = [third, first, second];
    if (group === 0) return { kind: "order", question: `${first}比${second}高，${second}比${third}高。请从高到矮排序`, cards, correctOrder, answer: correctOrder.join("|") };
    if (group === 1) return { kind: "order", question: `${first}比${second}早到，${second}比${third}早到。请从早到晚排序`, cards, correctOrder, answer: correctOrder.join("|") };
    if (group === 2) return { kind: "order", question: `排队时，${second}在${first}后面，${third}在${second}后面。请从前到后排序`, cards, correctOrder, answer: correctOrder.join("|") };
    return { kind: "order", question: `${first}有8颗星，${second}有6颗，${third}有5颗。请从多到少排序`, cards, correctOrder, answer: correctOrder.join("|") };
  }),
};

export const getGameChallenge = (taskId: string, value = new Date()) => {
  return getGameChallenges(taskId, value, 1)[0];
};

export const getGameChallenges = (taskId: string, value = new Date(), count = 8) => {
  const bank = gameQuestionBanks[taskId] ?? [];
  if (!bank.length) return [];
  const start = (dayNumber(value) * count) % bank.length;
  return Array.from({ length: Math.min(count, bank.length) }, (_, index) => bank[(start + index) % bank.length]);
};
