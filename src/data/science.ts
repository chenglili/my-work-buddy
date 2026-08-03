export type ScienceCharacter = "hello-kitty" | "my-melody" | "kuromi" | "cinnamoroll";

export interface SciencePanel {
  id: string;
  character: ScienceCharacter;
  characterName: string;
  caption: string;
  dialogue: string;
  fact: string;
  sticker: string;
}

export interface ScienceEpisode {
  id: string;
  title: string;
  topic: string;
  hook: string;
  panels: SciencePanel[];
}

export const scienceEpisodes: ScienceEpisode[] = [
  {
    id: "ant-teamwork",
    title: "蚂蚁搬家，谁在指挥？",
    topic: "动物小秘密",
    hook: "一粒饼干，也能开出一场超认真工程会。",
    panels: [
      { id: "ant-1", character: "kuromi", characterName: "酷洛米", caption: "饼干屑刚掉地上，蚂蚁小队立刻集合。", dialogue: "集合！今天搬的不是饼干，是我们的年度大项目！", fact: "蚂蚁会用触角和气味传递消息。", sticker: "集合啦" },
      { id: "ant-2", character: "hello-kitty", characterName: "Hello Kitty", caption: "一只蚂蚁先找到食物，再沿路留下气味。", dialogue: "我先去探路，回来时给大家画一条香香的路线！", fact: "找到食物的蚂蚁会留下气味线索，帮助同伴找到路。", sticker: "跟着气味走" },
      { id: "ant-3", character: "cinnamoroll", characterName: "大耳朵", caption: "大家沿着气味排队，饼干很快被搬回家。", dialogue: "没有总指挥也没关系，合作就是最强超能力！", fact: "蚂蚁靠分工合作完成搬运、照顾幼虫等工作。", sticker: "合作成功" },
    ],
  },
  {
    id: "plant-drinking-water",
    title: "小树喝水，嘴巴在哪里？",
    topic: "植物观察站",
    hook: "植物没有吸管，却能把水送到叶尖。",
    panels: [
      { id: "plant-1", character: "my-melody", characterName: "美乐蒂", caption: "美乐蒂盯着花盆，认真寻找植物的嘴巴。", dialogue: "叶子，你的吸管藏在哪？我保证不偷喝！", fact: "植物主要通过根吸收土壤里的水。", sticker: "寻找吸管" },
      { id: "plant-2", character: "hello-kitty", characterName: "Hello Kitty", caption: "水从根部出发，沿着茎里的细小管道向上走。", dialogue: "原来茎里面有水路，植物也有自己的快递系统！", fact: "茎里的输导组织会把水和无机盐运到叶子。", sticker: "水路开通" },
      { id: "plant-3", character: "my-melody", characterName: "美乐蒂", caption: "叶子把阳光、空气和水变成植物的能量。", dialogue: "阳光到位，厨房开工，今天也要努力长高！", fact: "叶子能利用阳光制造植物生长需要的养分。", sticker: "长高一点" },
    ],
  },
  {
    id: "body-blink",
    title: "眼睛为什么会眨呀眨？",
    topic: "身体小侦探",
    hook: "不是眼睛在打瞌睡，是它在做保护工作。",
    panels: [
      { id: "blink-1", character: "cinnamoroll", characterName: "大耳朵", caption: "大耳朵努力睁眼看漫画，眼睛却自动眨了一下。", dialogue: "等等！谁把我的眼睛遥控关了一秒？", fact: "眨眼是眼睛的自然动作，不需要我们特意指挥。", sticker: "自动模式" },
      { id: "blink-2", character: "kuromi", characterName: "酷洛米", caption: "眼皮轻轻合上，把泪液均匀铺在眼球表面。", dialogue: "这是眼睛的保湿面膜，敷完继续看！", fact: "眨眼能让泪液铺开，保持眼睛湿润并带走小灰尘。", sticker: "保湿完成" },
      { id: "blink-3", character: "cinnamoroll", characterName: "大耳朵", caption: "看到强光或有小东西靠近时，眼睛会更快保护自己。", dialogue: "眼皮虽小，反应可快了，我是眼睛保安队！", fact: "眨眼和闭眼反射能减少灰尘、强光对眼睛的刺激。", sticker: "安全防护" },
    ],
  },
  {
    id: "weather-rainbow",
    title: "彩虹是天空的调色盘吗？",
    topic: "天气变魔术",
    hook: "雨后太阳一露脸，天空就开始玩光的魔术。",
    panels: [
      { id: "rainbow-1", character: "hello-kitty", characterName: "Hello Kitty", caption: "雨后的天空亮起来，Hello Kitty 发现了一道彩色弧线。", dialogue: "天空是不是偷偷打翻了彩笔盒？", fact: "彩虹常出现在雨滴较多、太阳光照来的方向合适时。", sticker: "彩色出现" },
      { id: "rainbow-2", character: "my-melody", characterName: "美乐蒂", caption: "阳光进入小水滴后，会发生折射、反射和色彩分开。", dialogue: "一滴水里，居然住着一整盒彩虹！", fact: "白色阳光经过水滴后，可能分成红、橙、黄、绿、蓝、靛、紫等颜色。", sticker: "光线转弯" },
      { id: "rainbow-3", character: "kuromi", characterName: "酷洛米", caption: "换一个位置看，彩虹也像在跟着走。", dialogue: "它不是在跑，是我和光线的位置变啦！", fact: "彩虹是光线和水滴共同形成的现象，位置会随观察角度变化。", sticker: "换个角度" },
    ],
  },
  {
    id: "moon-light",
    title: "月亮会自己发光吗？",
    topic: "太空小剧场",
    hook: "月亮看起来很亮，但它其实没有自己的小灯泡。",
    panels: [
      { id: "moon-1", character: "my-melody", characterName: "美乐蒂", caption: "美乐蒂拿着望远镜，想找月亮背后的开关。", dialogue: "月亮同学，开关在哪里？我想开一下夜灯！", fact: "月亮本身不会像太阳那样发光。", sticker: "找开关" },
      { id: "moon-2", character: "hello-kitty", characterName: "Hello Kitty", caption: "太阳光照到月亮表面，月亮把一部分光反射到地球。", dialogue: "原来它是借来阳光，再给我们打个招呼！", fact: "我们看到的月光，主要是太阳光被月面反射后的光。", sticker: "借光成功" },
      { id: "moon-3", character: "cinnamoroll", characterName: "大耳朵", caption: "月亮绕地球转动，我们看到的亮面大小会改变。", dialogue: "月亮每天换造型，像宇宙里的变装达人！", fact: "月相变化和月亮绕地球运动、太阳光照射角度有关。", sticker: "换造型啦" },
    ],
  },
  {
    id: "safe-electricity",
    title: "插座为什么不能玩？",
    topic: "安全小卫士",
    hook: "电很有用，但它不是可以随便碰的玩具。",
    panels: [
      { id: "safe-1", character: "kuromi", characterName: "酷洛米", caption: "酷洛米发现插座上的小孔，马上伸手想研究。", dialogue: "里面是不是住着一只会发光的小虫？", fact: "插座里有电流，电流经过人体可能造成伤害。", sticker: "先停手" },
      { id: "safe-2", character: "hello-kitty", characterName: "Hello Kitty", caption: "Hello Kitty 赶紧请大人来处理插头和插座。", dialogue: "好奇可以问，插座不能拿手指做实验！", fact: "遇到电器、插座或破损电线，要请大人检查和处理。", sticker: "请大人来" },
      { id: "safe-3", character: "my-melody", characterName: "美乐蒂", caption: "小伙伴们记住：手湿时也不能碰电器。", dialogue: "水和电不要组队，安全才是第一名！", fact: "水会增加导电风险，湿手不要触碰插头和电器。", sticker: "安全第一" },
    ],
  },
  {
    id: "simple-lever",
    title: "小杠杆，大力气！",
    topic: "生活里的科技",
    hook: "一根木棍加一个支点，就能帮忙搬动重东西。",
    panels: [
      { id: "lever-1", character: "cinnamoroll", characterName: "大耳朵", caption: "大耳朵面对一块大石头，决定不用蛮力。", dialogue: "今天不比肌肉，改比聪明！", fact: "杠杆由硬棒和支点组成，可以帮助我们省力。", sticker: "动脑子" },
      { id: "lever-2", character: "kuromi", characterName: "酷洛米", caption: "把木棒放在石头下，再找一块小石头当支点。", dialogue: "支点站稳，木棒准备，杠杆小队出发！", fact: "支点的位置会影响杠杆使用时需要的力气。", sticker: "支点站稳" },
      { id: "lever-3", character: "cinnamoroll", characterName: "大耳朵", caption: "石头被慢慢撬起，大家开心地击掌。", dialogue: "工具不是魔法，是把力气用在更聪明的地方！", fact: "剪刀、跷跷板和开瓶器等物品都用到了杠杆原理。", sticker: "聪明省力" },
    ],
  },
  {
    id: "bird-feathers",
    title: "鸟儿为什么能飞？",
    topic: "动物飞行课",
    hook: "翅膀不是装饰，它们会和空气一起完成飞行。",
    panels: [
      { id: "bird-1", character: "hello-kitty", characterName: "Hello Kitty", caption: "Hello Kitty 看着小鸟展开翅膀，认真记录每一次扇动。", dialogue: "翅膀一扇，风就来上班了吗？", fact: "鸟翅膀的形状和扇动动作能帮助它们利用空气飞行。", sticker: "起飞观察" },
      { id: "bird-2", character: "my-melody", characterName: "美乐蒂", caption: "羽毛排列整齐，既轻又能帮助鸟儿控制方向。", dialogue: "每根羽毛都有岗位，谁也不能迟到！", fact: "羽毛能帮助鸟儿产生升力、控制方向并保持体温。", sticker: "羽毛分工" },
      { id: "bird-3", character: "kuromi", characterName: "酷洛米", caption: "鸟儿借着气流滑翔，翅膀不用一直用力扇。", dialogue: "省下来的力气，留着空中转圈圈！", fact: "一些鸟会利用上升气流滑翔，减少扇翅膀的次数。", sticker: "空中滑翔" },
    ],
  },
];

const dayNumber = (value: Date) => Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86400000);

export const getDailyScienceEpisode = (value = new Date()): ScienceEpisode => {
  const index = ((dayNumber(value) % scienceEpisodes.length) + scienceEpisodes.length) % scienceEpisodes.length;
  return scienceEpisodes[index];
};
