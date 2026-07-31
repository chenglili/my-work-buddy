export type TaskCategory = "chinese" | "math" | "english" | "game" | "sport";
export type ViewKey = "home" | TaskCategory | "shop";
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
    minutes: "10分钟",
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
    minutes: "15分钟",
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
    summary: "摸高跳200个以上达标，注意落地缓冲。",
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
  "chinese-morning-reading": { schedule: "core", completionMode: "timer", minimumDuration: 600, requiresParent: false },
  "chinese-preview-copybook": { schedule: "rotation", completionMode: "parent", requiresParent: true },
  "chinese-memorize": { schedule: "rotation", completionMode: "parent", requiresParent: true },
  "chinese-dictation": { schedule: "rotation", completionMode: "parent", requiresParent: true },
  "chinese-night-reading": { schedule: "core", completionMode: "timer", minimumDuration: 900, requiresParent: false },
  "chinese-picture-writing": { schedule: "rotation", completionMode: "parent", requiresParent: true },
  "chinese-reading-comprehension": { schedule: "rotation", completionMode: "auto", minimumScore: 80, requiresParent: false },
  "math-arithmetic": { schedule: "core", completionMode: "auto", minimumScore: 80, requiresParent: false },
  "math-multiply-divide": { schedule: "rotation", completionMode: "auto", minimumScore: 80, requiresParent: false },
  "math-word-problems": { schedule: "rotation", completionMode: "auto", minimumScore: 80, requiresParent: false },
  "english-daily": { schedule: "core", completionMode: "timer", minimumDuration: 900, requiresParent: false },
  "game-hanzi": { schedule: "optional", completionMode: "auto", minimumScore: 100, requiresParent: false },
  "game-number": { schedule: "optional", completionMode: "auto", minimumScore: 100, requiresParent: false },
  "game-spot": { schedule: "optional", completionMode: "auto", minimumScore: 100, requiresParent: false },
  "game-logic": { schedule: "optional", completionMode: "auto", minimumScore: 100, requiresParent: false },
  "sport-rope": { schedule: "core", completionMode: "parent", requiresParent: true },
  "sport-high-jump": { schedule: "core", completionMode: "parent", requiresParent: true },
  "sport-hour": { schedule: "core", completionMode: "parent", requiresParent: true },
};

export const taskCatalog: TaskDefinition[] = baseTaskCatalog.map((task) => ({ ...task, ...taskRules[task.id] }));

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

export const getDailyTaskIds = (value = new Date()) => {
  const sportId = sportTaskIds[dayNumber(value) % sportTaskIds.length];
  const common = ["chinese-morning-reading", "math-arithmetic", "english-daily", "chinese-night-reading", sportId];
  if (value.getDay() === 0) return common.filter((id) => id !== "math-arithmetic");
  return [...common, rotatingTaskIds[dayNumber(value) % rotatingTaskIds.length]];
};

export const optionalTaskIds = taskCatalog.filter((task) => task.schedule === "optional").map((task) => task.id);

export const sectionMeta: Record<ViewKey, { label: string; character: TaskDefinition["character"]; navIcon: string }> = {
  home: { label: "每日打卡", character: "hello-kitty", navIcon: "characters/hello-kitty.png" },
  chinese: { label: "语文专区", character: "my-melody", navIcon: "characters/my-melody.png" },
  math: { label: "数学专区", character: "kuromi", navIcon: "characters/kuromi.png" },
  english: { label: "英语专区", character: "cinnamoroll", navIcon: "characters/cinnamoroll.png" },
  game: { label: "益智游戏", character: "kuromi", navIcon: "characters/keroppi.svg" },
  sport: { label: "运动锻炼", character: "hello-kitty", navIcon: "characters/pochacco.svg" },
  shop: { label: "积分商店", character: "my-melody", navIcon: "characters/pompompurin.svg" },
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
      ],
      patterns: [
        { sentence: "Who's she? She's my aunt.", meaning: "她是谁？她是我的姨妈。" },
        { sentence: "Who's he? He's my uncle.", meaning: "他是谁？他是我的叔叔。" },
      ],
      tasks: ["听读4个家庭成员词语", "指着家庭照片介绍一位家人", "用Who's he/she?完成一组问答"],
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
      ],
      patterns: [
        { sentence: "I have a rabbit.", meaning: "我有一只兔子。" },
        { sentence: "It's cute.", meaning: "它很可爱。" },
      ],
      tasks: ["听音辨认4种宠物", "选择一种宠物说I have...", "用cute夸一夸小动物"],
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
      ],
      patterns: [
        { sentence: "It has a short tail.", meaning: "它有一条短尾巴。" },
        { sentence: "It has long ears.", meaning: "它有长耳朵。" },
      ],
      tasks: ["边听边指出耳朵和尾巴", "用long或short描述动物", "完整跟读两个It has...句子"],
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
      ],
      patterns: [
        { sentence: "It's cool in autumn.", meaning: "秋天天气凉爽。" },
        { sentence: "The leaves are yellow.", meaning: "树叶是黄色的。" },
      ],
      tasks: ["听读秋天和颜色词语", "观察窗外说一种秋天颜色", "跟读It's...和The leaves are..."],
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
      ],
      patterns: [
        { sentence: "Have some juice, please.", meaning: "请喝一些果汁。" },
        { sentence: "Thank you.", meaning: "谢谢你。" },
      ],
      tasks: ["听音选择食物或饮料", "和家长练习请别人品尝", "收到食物后说Thank you"],
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
      ],
      patterns: [
        { sentence: "This is our school.", meaning: "这是我们的学校。" },
        { sentence: "We like our school.", meaning: "我们喜欢我们的学校。" },
      ],
      tasks: ["听读3个校园地点", "用This is our...介绍一个地方", "说一说最喜欢的校园地点"],
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
      ],
      patterns: [
        { sentence: "Let's clean up!", meaning: "我们一起打扫吧！" },
        { sentence: "Clean the desk, please.", meaning: "请擦干净课桌。" },
      ],
      tasks: ["听指令指出课桌、椅子和地面", "跟读Let's...建议句", "边整理书桌边说一个英语指令"],
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
      ],
      patterns: [
        { sentence: "My dad is a doctor.", meaning: "我的爸爸是一名医生。" },
        { sentence: "What is he? He's a cook.", meaning: "他是做什么工作的？他是一名厨师。" },
      ],
      tasks: ["听读4种职业", "用My...is a...介绍家人", "完成一组职业问答"],
    },
  },
];

export const getWeeklyContent = (value = new Date()) => weeklyContent[Math.floor(dayNumber(value) / 7) % weeklyContent.length];

export const wordProblems = [
  { prompt: "小雨有28张贴纸，送给同学9张，还剩多少张？", answer: "19张" },
  { prompt: "图书角原来有36本书，又放进12本，现在有多少本？", answer: "48本" },
  { prompt: "每排有4盆花，摆了3排，一共有多少盆？", answer: "12盆" },
  { prompt: "18个苹果平均放进3个盘子，每盘几个？", answer: "6个" },
  { prompt: "公交车上有45人，下车8人，上车6人，现在有多少人？", answer: "43人" },
  { prompt: "一根彩带长60厘米，剪去25厘米，还剩多少厘米？", answer: "35厘米" },
];

export interface GameChallenge {
  question: string;
  options: string[];
  answer: string;
}

const hanziItems = [
  ["老师", "人物"], ["同学", "人物"], ["妈妈", "人物"], ["爸爸", "人物"], ["医生", "人物"],
  ["妹妹", "人物"], ["哥哥", "人物"], ["教室", "地点"], ["公园", "地点"], ["操场", "地点"],
  ["图书馆", "地点"], ["学校", "地点"], ["车站", "地点"], ["跑步", "动作"], ["写字", "动作"],
  ["唱歌", "动作"], ["跳绳", "动作"], ["读书", "动作"], ["画画", "动作"], ["整理", "动作"],
] as const;

const names = ["小雨", "乐乐", "安安"];

export const gameQuestionBanks: Record<string, GameChallenge[]> = {
  "game-hanzi": hanziItems.map(([word, answer]) => ({ question: `“${word}”应该放进哪个篮子？`, options: ["人物", "地点", "动作"], answer })),
  "game-number": Array.from({ length: 20 }, (_, index) => {
    const start = 1 + (index % 5);
    const step = 2 + (index % 4);
    const answer = start + step * 4;
    return { question: `${start}、${start + step}、${start + step * 2}、${start + step * 3}、？`, options: [String(answer - 1), String(answer), String(answer + step)], answer: String(answer) };
  }),
  "game-spot": Array.from({ length: 20 }, (_, index) => {
    const icons = ["🌸", "⭐", "🍎", "🐰", "🎈"];
    const same = icons[index % icons.length];
    const different = icons[(index + 1) % icons.length];
    const position = (index % 4) + 1;
    const row = Array.from({ length: 4 }, (_, itemIndex) => itemIndex + 1 === position ? different : same).join("　");
    return { question: `${row} 中哪一个不同？`, options: ["第1个", "第2个", "第3个", "第4个"], answer: `第${position}个` };
  }),
  "game-logic": Array.from({ length: 20 }, (_, index) => {
    const first = names[index % names.length];
    const second = names[(index + 1) % names.length];
    const third = names[(index + 2) % names.length];
    return { question: `${first}比${second}高，${second}比${third}高，谁最高？`, options: [first, second, third], answer: first };
  }),
};

export const getGameChallenge = (taskId: string, value = new Date()) => {
  const bank = gameQuestionBanks[taskId];
  return bank[dayNumber(value) % bank.length];
};
