import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Gift, Home, Play, RotateCcw, ShoppingBag, Star } from "lucide-react";
import {
  characterImages,
  copybookWords,
  curriculumNote,
  dictationWords,
  gameChallenges,
  memorizationPassages,
  requiredTaskIds,
  sectionMeta,
  taskCatalog,
  type TaskCategory,
  type TaskDefinition,
  type ViewKey,
  wordProblems,
} from "./appData";
import { chinesePrepLessons, chineseReadings, readingComprehensions, shopRewards } from "./data";
import {
  calculateStreak,
  completeTask,
  readStoredState,
  redeemReward,
  STORAGE_KEY,
  type WorkspaceState,
} from "./state/workspace";

type Route = { view: ViewKey; taskId?: string };

interface ArithmeticQuestion {
  prompt: string;
  answer: number;
}

const sectionKeys: ViewKey[] = ["home", "chinese", "math", "english", "game", "sport", "shop"];

const encouragementByCharacter = {
  "hello-kitty": "Hello Kitty提醒：认真完成一小步，今天就更稳一点。",
  "my-melody": "美乐蒂说：慢慢读、认真写，好习惯会留下来。",
  kuromi: "库洛米说：闯关要专注，答完再检查一遍。",
  cinnamoroll: "玉桂狗说：轻轻松松坚持，星星就会一点点变多。",
};

const formatDate = (value: string) => value.slice(5).replace("-", "/");

const generateArithmetic = (seedText: string): ArithmeticQuestion[] => {
  let seed = [...seedText].reduce((sum, char) => sum + char.charCodeAt(0), 37);
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    return seed;
  };

  return Array.from({ length: 60 }, (_, index) => {
    const isAdd = index % 3 !== 1;
    if (isAdd) {
      const a = next() % 70;
      const b = next() % (100 - a);
      return { prompt: `${a} + ${b} =`, answer: a + b };
    }
    const a = 20 + (next() % 80);
    const b = next() % (a + 1);
    return { prompt: `${a} - ${b} =`, answer: a - b };
  });
};

export default function App() {
  const [state, setState] = useState<WorkspaceState>(() => readStoredState());
  const [route, setRoute] = useState<Route>({ view: "home" });
  const [toast, setToast] = useState("");
  const [showVictory, setShowVictory] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const completedCount = state.completedTaskIds.length;
  const progress = Math.round((completedCount / requiredTaskIds.length) * 100);
  const streak = calculateStreak(state.completedDates);
  const currentTask = route.taskId ? taskCatalog.find((task) => task.id === route.taskId) : undefined;

  const markTaskDone = (task: TaskDefinition) => {
    const beforeBonus = state.bonusAwarded;
    const nextState = completeTask(state, task.id, task.points, requiredTaskIds);
    setState(nextState);
    setToast(`${task.shortTitle}完成，获得${task.points}积分`);
    if (!beforeBonus && nextState.bonusAwarded) setShowVictory(true);
  };

  const navigate = (view: ViewKey) => setRoute({ view });
  const openTask = (taskId: string) => setRoute({ view: taskCatalog.find((task) => task.id === taskId)?.category ?? "home", taskId });

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="学习导航">
        <div className="brand">
          <img src={characterImages["hello-kitty"]} alt="" />
          <span>粉粉学习台</span>
        </div>
        <nav>
          {sectionKeys.map((key) => (
            <button key={key} aria-label={sectionMeta[key].label} className={route.view === key && !route.taskId ? "active" : ""} onClick={() => navigate(key)}>
              <span className="nav-icon">{sectionMeta[key].icon}</span>
              <span className="nav-label">{sectionMeta[key].label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <TopBar points={state.points} progress={progress} completedCount={completedCount} streak={streak} />
        {toast ? <div className="toast" onAnimationEnd={() => setToast("")}>{toast}</div> : null}

        {currentTask ? (
          <TaskPage task={currentTask} completed={state.completedTaskIds.includes(currentTask.id)} onBack={() => setRoute({ view: currentTask.category })} onDone={() => markTaskDone(currentTask)} dateKey={state.dateKey} />
        ) : route.view === "home" ? (
          <HomePage completedIds={state.completedTaskIds} onOpenTask={openTask} onDone={markTaskDone} />
        ) : route.view === "shop" ? (
          <ShopPage state={state} setState={setState} onBack={() => navigate("home")} streak={streak} />
        ) : (
          <SectionPage view={route.view} completedIds={state.completedTaskIds} onOpenTask={openTask} onBack={() => navigate("home")} />
        )}
      </main>

      {showVictory ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="victory">
            <img src={characterImages["my-melody"]} alt="" />
            <h2>今日全部通关</h2>
            <p>额外奖励15积分已经到账。今天的学习、运动和小游戏都完成了。</p>
            <button className="primary" onClick={() => setShowVictory(false)}>收下奖励</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TopBar({ points, progress, completedCount, streak }: { points: number; progress: number; completedCount: number; streak: number }) {
  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">一升二预习工作台</p>
        <h1>江苏二年级上册预习</h1>
      </div>
      <div className="stats">
        <span><Star size={18} />{points} 积分</span>
        <span><CheckCircle2 size={18} />{completedCount}/18 完成</span>
        <span>{progress}% 今日进度</span>
        <span>{streak} 天连续打卡</span>
      </div>
    </header>
  );
}

function HomePage({ completedIds, onOpenTask, onDone }: { completedIds: string[]; onOpenTask: (taskId: string) => void; onDone: (task: TaskDefinition) => void }) {
  return (
    <section>
      <div className="home-hero">
        <img src={characterImages["hello-kitty"]} alt="" />
        <div>
          <p className="eyebrow">{curriculumNote}</p>
          <h2>今日任务清单</h2>
          <p>全部18项完成后自动发放额外15积分，并记录当天打卡。</p>
        </div>
      </div>
      <TaskGrid tasks={taskCatalog} completedIds={completedIds} onOpenTask={onOpenTask} onDone={onDone} />
    </section>
  );
}

function SectionPage({ view, completedIds, onOpenTask, onBack }: { view: TaskCategory; completedIds: string[]; onOpenTask: (taskId: string) => void; onBack: () => void }) {
  const tasks = taskCatalog.filter((task) => task.category === view);
  const meta = sectionMeta[view];

  return (
    <section>
      <BackButton onBack={onBack} />
      <div className="section-title">
        <img src={characterImages[meta.character]} alt="" />
        <div>
          <p className="eyebrow">{curriculumNote}</p>
          <h2>{meta.label}</h2>
        </div>
      </div>
      <TaskGrid tasks={tasks} completedIds={completedIds} onOpenTask={onOpenTask} />
    </section>
  );
}

function TaskGrid({ tasks, completedIds, onOpenTask, onDone }: { tasks: TaskDefinition[]; completedIds: string[]; onOpenTask: (taskId: string) => void; onDone?: (task: TaskDefinition) => void }) {
  return (
    <div className="task-grid">
      {tasks.map((task) => {
        const completed = completedIds.includes(task.id);
        return (
          <article className={completed ? "task-card completed" : "task-card"} key={task.id}>
            <img src={characterImages[task.character]} alt="" />
            <div>
              <p className="task-meta">{sectionMeta[task.category].label} · {task.minutes} · +{task.points}</p>
              <h3>{task.title}</h3>
              <p>{task.summary}</p>
            </div>
            <div className="card-actions">
              <button className="secondary" onClick={() => onOpenTask(task.id)}><Play size={16} />开始挑战</button>
              {onDone ? (
                <button className="primary" disabled={completed} onClick={() => onDone(task)}><CheckCircle2 size={16} />{completed ? "已打卡" : "完成打卡"}</button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TaskPage({ task, completed, onBack, onDone, dateKey }: { task: TaskDefinition; completed: boolean; onBack: () => void; onDone: () => void; dateKey: string }) {
  return (
    <section>
      <BackButton onBack={onBack} />
      <div className="task-head">
        <img src={characterImages[task.character]} alt="" />
        <div>
          <p className="eyebrow">{sectionMeta[task.category].label} · {task.minutes} · 完成+{task.points}积分</p>
          <h2>{task.title}</h2>
          <p>{encouragementByCharacter[task.character]}</p>
        </div>
      </div>
      <TaskContent task={task} dateKey={dateKey} />
      <div className="finish-bar">
        <button className="primary big" disabled={completed} onClick={onDone}>
          <CheckCircle2 size={20} />{completed ? "今天已完成" : `完成打卡 +${task.points}`}
        </button>
      </div>
    </section>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return <button className="back-button" onClick={onBack}><ArrowLeft size={18} />返回首页</button>;
}

function TaskContent({ task, dateKey }: { task: TaskDefinition; dateKey: string }) {
  switch (task.id) {
    case "chinese-morning-reading":
      return <MorningReading />;
    case "chinese-preview-copybook":
      return <CopybookPreview />;
    case "chinese-memorize":
      return <Memorize />;
    case "chinese-dictation":
      return <Dictation />;
    case "chinese-night-reading":
      return <NightReading />;
    case "chinese-picture-writing":
      return <PictureWriting />;
    case "chinese-reading-comprehension":
      return <ReadingComprehensionPanel />;
    case "math-arithmetic":
      return <Arithmetic dateKey={dateKey} />;
    case "math-multiply-divide":
      return <MultiplyDivide />;
    case "math-word-problems":
      return <WordProblems />;
    case "english-daily":
      return <EnglishDaily />;
    case "sport-rope":
    case "sport-high-jump":
    case "sport-hour":
      return <SportTask taskId={task.id} />;
    default:
      return <GameTask taskId={task.id as keyof typeof gameChallenges} />;
  }
}

function speak(text: string, lang = "zh-CN") {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

function MorningReading() {
  const prep = chinesePrepLessons[0];
  return (
    <div className="content-grid">
      {chineseReadings.map((item) => (
        <article className="panel" key={item.id}>
          <h3>{item.title}</h3>
          <p className="muted">{item.author} · {item.sourceNote}</p>
          {item.lines.map((line) => <p className="poem-line" key={line}>{line}</p>)}
          <button className="secondary" onClick={() => speak(item.lines.join(""))}><Play size={16} />跟读播放</button>
        </article>
      ))}
      <article className="panel">
        <h3>{prep.title}</h3>
        {prep.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <p className="muted">组词：{prep.vocabulary.map((item) => `${item.text}-${item.word}`).join("、")}</p>
      </article>
    </div>
  );
}

function CopybookPreview() {
  return (
    <div className="content-grid">
      {copybookWords.map((item) => (
        <article className="word-card" key={item.word}>
          <strong>{item.word}</strong>
          <p>{item.pinyin}</p>
          <p>{item.strokes}</p>
          <p>{item.group}</p>
        </article>
      ))}
    </div>
  );
}

function Memorize() {
  return (
    <div className="panel-list">
      {memorizationPassages.map((line, index) => (
        <article className="panel" key={line}>
          <h3>第{index + 1}关</h3>
          <p className="poem-line">{line}</p>
          <button className="secondary" onClick={() => speak(line)}><Play size={16} />听一遍</button>
        </article>
      ))}
    </div>
  );
}

function Dictation() {
  const [index, setIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const current = dictationWords[index];

  const playCurrent = () => speak(`请写：${current}`);
  const next = () => {
    if (index >= dictationWords.length - 1) {
      setShowAnswers(true);
      return;
    }
    setIndex(index + 1);
    window.setTimeout(() => speak(`请写：${dictationWords[index + 1]}`), 250);
  };

  return (
    <div className="panel dictation">
      <h3>语音听写</h3>
      <p>当前第 {index + 1} / {dictationWords.length} 个。播放后留出书写时间，可重复播放。</p>
      <div className="dictation-word">{showAnswers ? "答案已显示" : "请听语音写字"}</div>
      <div className="inline-actions">
        <button className="primary" onClick={playCurrent}><Play size={16} />播放生字</button>
        <button className="secondary" onClick={playCurrent}><RotateCcw size={16} />重复播放</button>
        <button className="secondary" onClick={next}>{index >= dictationWords.length - 1 ? "显示答案" : "下一个"}</button>
      </div>
      {showAnswers ? <p className="answer-strip">{dictationWords.join("　")}</p> : null}
    </div>
  );
}

function NightReading() {
  const [seconds, setSeconds] = useState(30 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const id = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(id);
  }, [running, seconds]);

  return (
    <div className="panel">
      <h3>晚读计时</h3>
      <p>小河边的柳树轻轻摇着枝条。月亮出来了，水面像铺了一层银光。小朋友读完故事，合上书，对今天说晚安。</p>
      <div className="timer">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</div>
      <button className="primary" onClick={() => setRunning(!running)}>{running ? "暂停" : "开始计时"}</button>
    </div>
  );
}

function PictureWriting() {
  return (
    <div className="panel">
      <h3>情景：雨后校园</h3>
      <div className="picture-scene">🌧️　🌈　🏫　👧</div>
      <p>提示词：雨停了、彩虹、操场、开心、慢慢走。</p>
      <textarea placeholder="写2-4句话，例如先写看到了什么，再写大家在做什么。" />
      <details>
        <summary>查看范文</summary>
        <p>雨停了，天空出现了一道彩虹。同学们慢慢走到操场边，看见树叶亮晶晶的。大家都很开心。</p>
      </details>
    </div>
  );
}

function ReadingComprehensionPanel() {
  const item = readingComprehensions[0];
  const [show, setShow] = useState(false);

  return (
    <div className="panel">
      <h3>{item.title}</h3>
      {item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {item.questions.map((question) => (
        <div className="question" key={question.id}>
          <p>{question.prompt}</p>
          {question.options ? question.options.map((option) => <label key={option}><input type="radio" name={question.id} />{option}</label>) : <input placeholder="口头说答案或简单写一句" />}
          {show ? <p className="answer">答案：{question.answer}。{question.explanation}</p> : null}
        </div>
      ))}
      <button className="secondary" onClick={() => setShow(true)}>核对答案解析</button>
    </div>
  );
}

function Arithmetic({ dateKey }: { dateKey: string }) {
  const questions = useMemo(() => generateArithmetic(dateKey), [dateKey]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const correct = questions.filter((question, index) => Number(answers[index]) === question.answer).length;

  return (
    <div className="panel">
      <h3>100以内加减法 60道</h3>
      <div className="arithmetic-grid">
        {questions.map((question, index) => (
          <label key={`${question.prompt}-${index}`}>
            <span>{index + 1}. {question.prompt}</span>
            <input inputMode="numeric" value={answers[index] ?? ""} onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })} />
            {checked ? <b>{question.answer}</b> : null}
          </label>
        ))}
      </div>
      <button className="primary" onClick={() => setChecked(true)}>核对答案</button>
      {checked ? <p className="answer">答对 {correct} / {questions.length} 道。</p> : null}
    </div>
  );
}

function MultiplyDivide() {
  const items = [
    ["二三得六", "2 x 3 = 6"],
    ["三四十二", "3 x 4 = 12"],
    ["四五二十", "4 x 5 = 20"],
    ["12 ÷ 3 =", "4"],
    ["18 ÷ 6 =", "3"],
  ];
  return <SimplePractice title="口诀入门" items={items} />;
}

function WordProblems() {
  return <SimplePractice title="生活化应用题" items={wordProblems.map((item) => [item.prompt, item.answer])} />;
}

function EnglishDaily() {
  return (
    <div className="panel-list">
      <article className="panel">
        <h3>今日英语安排</h3>
        <p>英文动画30分钟，英语听读累计1小时以上。</p>
        {["Hello! I am happy.", "Good morning.", "This is my book."].map((line) => (
          <button className="secondary sentence" key={line} onClick={() => speak(line, "en-US")}><Play size={16} />{line}</button>
        ))}
      </article>
    </div>
  );
}

function GameTask({ taskId }: { taskId: keyof typeof gameChallenges }) {
  const challenge = gameChallenges[taskId];
  const [answer, setAnswer] = useState("");

  return (
    <div className="panel">
      <h3>{challenge.question}</h3>
      <div className="option-row">
        {challenge.options.map((option) => <button className={answer === option ? "selected" : "secondary"} key={option} onClick={() => setAnswer(option)}>{option}</button>)}
      </div>
      {answer ? <p className={answer === challenge.answer ? "answer" : "muted"}>{answer === challenge.answer ? "通关成功，可以打卡。" : "再想一想，答案还不对。"}</p> : null}
    </div>
  );
}

function SportTask({ taskId }: { taskId: string }) {
  const target = taskId === "sport-rope" ? "跳绳500个以上" : taskId === "sport-high-jump" ? "摸高跳200个以上" : "运动累计1小时以上";
  return (
    <div className="panel">
      <h3>{target}</h3>
      <p>运动前先热身，完成后由家长确认数量或时长，再点击完成打卡。</p>
      <input className="wide-input" placeholder="记录数量或时长，例如：跳绳520个" />
    </div>
  );
}

function SimplePractice({ title, items }: { title: string; items: string[][] }) {
  const [show, setShow] = useState(false);
  return (
    <div className="panel">
      <h3>{title}</h3>
      {items.map(([prompt, answer], index) => (
        <div className="question" key={`${prompt}-${index}`}>
          <p>{index + 1}. {prompt}</p>
          <input placeholder="写答案" />
          {show ? <p className="answer">答案：{answer}</p> : null}
        </div>
      ))}
      <button className="secondary" onClick={() => setShow(true)}>核对答案</button>
    </div>
  );
}

function ShopPage({ state, setState, onBack, streak }: { state: WorkspaceState; setState: (state: WorkspaceState) => void; onBack: () => void; streak: number }) {
  const redeem = (reward: (typeof shopRewards)[number]) => {
    const next = redeemReward(state, { id: reward.id, name: reward.name, cost: reward.costStars });
    if (next) setState(next);
  };

  return (
    <section>
      <BackButton onBack={onBack} />
      <div className="section-title">
        <ShoppingBag size={42} />
        <div>
          <p className="eyebrow">实物奖励需家长协助兑现</p>
          <h2>积分兑换商店</h2>
        </div>
      </div>
      <div className="shop-grid">
        {shopRewards.map((reward) => (
          <article className="task-card" key={reward.id}>
            <div className="reward-icon">{reward.emoji}</div>
            <div>
              <h3>{reward.name}</h3>
              <p>{reward.description}</p>
              <p className="task-meta">{reward.costStars}积分</p>
            </div>
            <button className="primary" disabled={state.points < reward.costStars} onClick={() => redeem(reward)}><Gift size={16} />兑换</button>
          </article>
        ))}
      </div>
      <div className="history-layout">
        <article className="panel">
          <h3>打卡日历</h3>
          <div className="calendar">{state.completedDates.slice(-14).map((date) => <span key={date}>{formatDate(date)}</span>)}</div>
          <p>{streak >= 7 ? "已解锁7天连续打卡三丽鸥勋章。" : `还差${Math.max(0, 7 - streak)}天解锁7天连续打卡勋章。`}</p>
        </article>
        <article className="panel">
          <h3>兑换记录</h3>
          {state.redemptions.length ? state.redemptions.map((item) => <p key={item.id}>{item.rewardName} - {item.cost}积分</p>) : <p className="muted">还没有兑换记录。</p>}
        </article>
      </div>
    </section>
  );
}
