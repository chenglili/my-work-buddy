import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Gift,
  LockKeyhole,
  Play,
  RotateCcw,
  ShoppingBag,
  Star,
  Trophy,
} from "lucide-react";
import {
  characterImages,
  curriculumNote,
  getDailyTaskIds,
  getGameChallenge,
  getWeeklyContent,
  optionalTaskIds,
  sectionMeta,
  taskCatalog,
  type TaskCategory,
  type TaskDefinition,
  type ViewKey,
  wordProblems,
} from "./appData";
import { chineseReadings, readingComprehensions, shopRewards } from "./data";
import {
  adjustPoints,
  approveReward,
  calculateStreak,
  completeTask,
  DEFAULT_PARENT_PIN,
  fulfillReward,
  getWeeklyReport,
  isWeekend,
  readStoredState,
  refreshDailyState,
  requestReward,
  STORAGE_KEY,
  unlockedBadges,
  updateParentPin,
  verifyParentPin,
  type CompletionResultInput,
  type WorkspaceState,
} from "./state/workspace";

type Route = { view: ViewKey; taskId?: string };

export interface ArithmeticQuestion {
  prompt: string;
  answer: number;
}

interface TaskOutcome extends CompletionResultInput {
  ready: boolean;
  message?: string;
}

const emptyOutcome: TaskOutcome = { ready: false, durationSeconds: 0, attempts: 1, wrongQuestions: [] };
const sectionKeys: ViewKey[] = ["home", "chinese", "math", "english", "game", "sport", "shop"];
const encouragements = [
  "认真完成一小步，今天就更稳一点。",
  "慢慢读、认真写，好习惯会留下来。",
  "闯关要专注，答完再检查一遍。",
  "轻轻松松坚持，积分会一点点变多。",
];

const dateFromKey = (value: string) => new Date(`${value}T12:00:00`);
const formatDate = (value: string) => value.slice(5).replace("-", "/");

export const generateArithmetic = (seedText: string, count = 20): ArithmeticQuestion[] => {
  let seed = [...seedText].reduce((sum, char) => sum + char.charCodeAt(0), 37);
  const next = () => {
    seed = Math.floor((seed * 1103515245 + 12345) % 2147483647);
    return seed;
  };

  return Array.from({ length: count }, (_, index) => {
    const isAdd = index % 3 !== 1;
    if (isAdd) {
      const a = 1 + (next() % 99);
      const b = 1 + (next() % (100 - a));
      return { prompt: `${a} + ${b} =`, answer: a + b };
    }
    const a = 2 + (next() % 99);
    const b = 1 + (next() % (a - 1));
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

  useEffect(() => {
    const id = window.setInterval(() => setState((current) => refreshDailyState(current)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route.view, route.taskId]);

  const currentDate = dateFromKey(state.dateKey);
  const requiredTaskIds = getDailyTaskIds(currentDate);
  const completedRequired = requiredTaskIds.filter((id) => state.completedTaskIds.includes(id)).length;
  const progress = Math.round((completedRequired / requiredTaskIds.length) * 100);
  const streak = calculateStreak(state.completedDates);
  const currentTask = route.taskId ? taskCatalog.find((task) => task.id === route.taskId) : undefined;

  const markTaskDone = (task: TaskDefinition, outcome: TaskOutcome) => {
    const beforeBonus = state.bonusAwarded;
    const nextState = completeTask(state, task.id, task.points, requiredTaskIds, outcome);
    setState(nextState);
    setToast(`${task.shortTitle}完成，获得${task.points}积分。${encouragements[state.taskResults.length % encouragements.length]}`);
    if (!beforeBonus && nextState.bonusAwarded) setShowVictory(true);
  };

  const navigate = (view: ViewKey) => setRoute({ view });
  const openTask = (taskId: string) => setRoute({ view: taskCatalog.find((task) => task.id === taskId)?.category ?? "home", taskId });

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="学习导航">
        <div className="brand">
          <img src={characterImages["hello-kitty"]} alt="" />
          <span>甜心工作台</span>
        </div>
        <nav>
          {sectionKeys.map((key) => (
            <button key={key} aria-label={sectionMeta[key].label} className={route.view === key && !route.taskId ? "active" : ""} onClick={() => navigate(key)}>
              <img className="nav-icon-image" src={sectionMeta[key].navIcon} alt="" />
              <span className="nav-label">{sectionMeta[key].label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <TopBar points={state.points} progress={progress} completedCount={completedRequired} requiredCount={requiredTaskIds.length} streak={streak} />
        {toast ? <div className="toast" onAnimationEnd={() => setToast("")}>{toast}</div> : null}

        {currentTask ? (
          <TaskPage task={currentTask} completed={state.completedTaskIds.includes(currentTask.id)} state={state} dateKey={state.dateKey} onDone={(outcome) => markTaskDone(currentTask, outcome)} />
        ) : route.view === "home" ? (
          <HomePage state={state} requiredTaskIds={requiredTaskIds} onOpenTask={openTask} />
        ) : route.view === "shop" ? (
          <ShopPage state={state} setState={setState} streak={streak} />
        ) : (
          <SectionPage view={route.view} completedIds={state.completedTaskIds} requiredTaskIds={requiredTaskIds} onOpenTask={openTask} />
        )}
      </main>

      {showVictory ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="victory">
            <img src={characterImages["hello-kitty"]} alt="" />
            <h2>今日计划全部完成</h2>
            <p>额外15积分已经到账。今天认真完成了真正需要做的任务，可以安心休息啦。</p>
            <button className="primary" onClick={() => setShowVictory(false)}>收下奖励</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TopBar({ points, progress, completedCount, requiredCount, streak }: { points: number; progress: number; completedCount: number; requiredCount: number; streak: number }) {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <div>
          <p className="eyebrow">一升二预习工作台</p>
          <h1>江苏二年级上册预习</h1>
        </div>
      </div>
      <div className="stats">
        <span><Star size={18} />{points} 积分</span>
        <span><CheckCircle2 size={18} />{completedCount}/{requiredCount} 完成</span>
        <span>{progress}% 今日进度</span>
        <span>{streak} 天连续打卡</span>
      </div>
    </header>
  );
}

function HomePage({ state, requiredTaskIds, onOpenTask }: { state: WorkspaceState; requiredTaskIds: string[]; onOpenTask: (taskId: string) => void }) {
  const dailyTasks = requiredTaskIds.map((id) => taskCatalog.find((task) => task.id === id)).filter((task): task is TaskDefinition => Boolean(task));
  const optionalTasks = optionalTaskIds.map((id) => taskCatalog.find((task) => task.id === id)).filter((task): task is TaskDefinition => Boolean(task));
  const requiredDone = requiredTaskIds.every((id) => state.completedTaskIds.includes(id));
  const report = getWeeklyReport(state);
  const weeklyTarget = 250;
  const weeklyProgress = Math.min(100, Math.round((report.earnedPoints / weeklyTarget) * 100));
  const weekContent = getWeeklyContent(dateFromKey(state.dateKey));

  return (
    <section>
      <div className="home-hero">
        <img src={characterImages["hello-kitty"]} alt="" />
        <div>
          <p className="eyebrow">{curriculumNote}</p>
          <h2>今日任务 · {weekContent.theme}</h2>
          <p>完成今天{requiredTaskIds.length}项必做任务可获得额外15积分，预计总用时60–90分钟。</p>
        </div>
      </div>
      <article className="weekly-goal">
        <div><strong>本周目标</strong><span>{report.earnedPoints} / {weeklyTarget} 积分</span></div>
        <div className="progress-track" aria-label={`本周进度${weeklyProgress}%`}><span style={{ width: `${weeklyProgress}%` }} /></div>
        <p>{report.earnedPoints >= weeklyTarget ? "本周小玩具目标已经达成，周末请家长确认兑换。" : `再获得${weeklyTarget - report.earnedPoints}积分，就达到小玩具周目标。`}</p>
      </article>
      <TaskGrid tasks={dailyTasks} completedIds={state.completedTaskIds} requiredTaskIds={requiredTaskIds} onOpenTask={onOpenTask} />
      <div className="section-title compact-title">
        <Trophy size={34} />
        <div><h2>奖励小游戏</h2><p>{requiredDone ? "今日计划完成，小游戏已解锁。" : "完成今日计划后解锁，不影响全通关。"}</p></div>
      </div>
      <TaskGrid tasks={optionalTasks} completedIds={state.completedTaskIds} requiredTaskIds={requiredTaskIds} onOpenTask={onOpenTask} locked={!requiredDone} />
    </section>
  );
}

function SectionPage({ view, completedIds, requiredTaskIds, onOpenTask }: { view: TaskCategory; completedIds: string[]; requiredTaskIds: string[]; onOpenTask: (taskId: string) => void }) {
  const tasks = taskCatalog.filter((task) => task.category === view);
  const meta = sectionMeta[view];
  return (
    <section>
      <div className="section-title">
        <img src={characterImages[meta.character]} alt="" />
        <div><p className="eyebrow">{curriculumNote}</p><h2>{meta.label}</h2></div>
      </div>
      <TaskGrid tasks={tasks} completedIds={completedIds} requiredTaskIds={requiredTaskIds} onOpenTask={onOpenTask} />
    </section>
  );
}

function TaskGrid({ tasks, completedIds, requiredTaskIds, onOpenTask, locked = false }: { tasks: TaskDefinition[]; completedIds: string[]; requiredTaskIds: string[]; onOpenTask: (taskId: string) => void; locked?: boolean }) {
  return (
    <div className="task-grid">
      {tasks.map((task) => {
        const completed = completedIds.includes(task.id);
        const required = requiredTaskIds.includes(task.id);
        return (
          <article className={completed ? "task-card completed" : "task-card"} key={task.id}>
            <img src={characterImages[task.character]} alt="" />
            <div>
              <p className="task-meta">{required ? "今日必做" : task.schedule === "optional" ? "奖励任务" : "本周轮换"} · {task.minutes} · +{task.points}</p>
              <h3>{task.title}</h3>
              <p>{task.summary}</p>
            </div>
            <div className="card-actions">
              <button className="secondary" disabled={locked} onClick={() => onOpenTask(task.id)}>{locked ? <LockKeyhole size={16} /> : <Play size={16} />}{locked ? "完成计划后解锁" : completed ? "查看练习" : "开始挑战"}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TaskPage({ task, completed, state, dateKey, onDone }: { task: TaskDefinition; completed: boolean; state: WorkspaceState; dateKey: string; onDone: (outcome: TaskOutcome) => void }) {
  const [outcome, setOutcome] = useState<TaskOutcome>(completed ? { ...emptyOutcome, ready: true } : emptyOutcome);
  const [parentPin, setParentPin] = useState("");
  const startedAt = useRef(Date.now());
  useEffect(() => {
    setOutcome(completed ? { ...emptyOutcome, ready: true } : emptyOutcome);
    setParentPin("");
    startedAt.current = Date.now();
  }, [task.id, completed]);

  const parentApproved = !task.requiresParent || verifyParentPin(state, parentPin);
  const canComplete = outcome.ready && parentApproved && !completed;

  return (
    <section>
      <div className="task-head">
        <img src={characterImages[task.character]} alt="" />
        <div>
          <p className="eyebrow">{sectionMeta[task.category].label} · {task.minutes} · 完成+{task.points}积分</p>
          <h2>{task.title}</h2>
          <p>{encouragements[taskCatalog.indexOf(task) % encouragements.length]}</p>
        </div>
      </div>
      <TaskContent task={task} dateKey={dateKey} onProgress={setOutcome} />
      {task.requiresParent ? (
        <article className="parent-confirm panel">
          <div><LockKeyhole size={20} /><strong>家长确认</strong></div>
          <p>练习达到要求后，请家长输入四位口令。初始口令可在积分商店的家长区修改。</p>
          <input className="pin-input" inputMode="numeric" maxLength={4} value={parentPin} onChange={(event) => setParentPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="四位家长口令" />
          {parentPin.length === 4 ? <p className={parentApproved ? "answer" : "gentle-retry"}>{parentApproved ? "家长确认成功。" : "口令不对，请家长再试一次。"}</p> : null}
        </article>
      ) : null}
      <div className="finish-bar">
        <p className={outcome.ready ? "answer" : "muted"}>{completed ? "今天已经获得过这项积分。" : outcome.message ?? completionHint(task)}</p>
        <button className="primary big" disabled={!canComplete} onClick={() => onDone({
          ...outcome,
          durationSeconds: Math.max(outcome.durationSeconds ?? 0, Math.round((Date.now() - startedAt.current) / 1000)),
        })}>
          <CheckCircle2 size={20} />{completed ? "今天已完成" : `完成任务 +${task.points}`}
        </button>
      </div>
    </section>
  );
}

function completionHint(task: TaskDefinition) {
  if (task.completionMode === "timer") return `有效练习达到${Math.round((task.minimumDuration ?? 0) / 60)}分钟后解锁积分。`;
  if (task.completionMode === "parent") return "先完成练习要求，再请家长确认。";
  return `正确率达到${task.minimumScore ?? 80}%后解锁积分。`;
}

function TaskContent({ task, dateKey, onProgress }: { task: TaskDefinition; dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const minimumDuration = task.minimumDuration ?? 0;
  switch (task.id) {
    case "chinese-morning-reading": return <MorningReading dateKey={dateKey} minimumDuration={minimumDuration} onProgress={onProgress} />;
    case "chinese-preview-copybook": return <CopybookPreview dateKey={dateKey} onProgress={onProgress} />;
    case "chinese-memorize": return <Memorize dateKey={dateKey} onProgress={onProgress} />;
    case "chinese-dictation": return <Dictation dateKey={dateKey} onProgress={onProgress} />;
    case "chinese-night-reading": return <NightReading dateKey={dateKey} minimumDuration={minimumDuration} onProgress={onProgress} />;
    case "chinese-picture-writing": return <PictureWriting dateKey={dateKey} onProgress={onProgress} />;
    case "chinese-reading-comprehension": return <ReadingComprehensionPanel dateKey={dateKey} onProgress={onProgress} />;
    case "math-arithmetic": return <Arithmetic dateKey={dateKey} onProgress={onProgress} />;
    case "math-multiply-divide": return <MultiplyDivide onProgress={onProgress} />;
    case "math-word-problems": return <WordProblems dateKey={dateKey} onProgress={onProgress} />;
    case "english-daily": return <EnglishDaily dateKey={dateKey} minimumDuration={minimumDuration} onProgress={onProgress} />;
    case "sport-rope":
    case "sport-high-jump":
    case "sport-hour": return <SportTask taskId={task.id} onProgress={onProgress} />;
    default: return <GameTask taskId={task.id} dateKey={dateKey} onProgress={onProgress} />;
  }
}

function speak(text: string, lang = "zh-CN") {
  const speechWindow = window as unknown as {
    speechSynthesis?: SpeechSynthesis;
    SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
    alert: (message: string) => void;
  };
  if (!speechWindow.speechSynthesis || !speechWindow.SpeechSynthesisUtterance) {
    speechWindow.alert("当前浏览器暂不支持语音播放，请使用手机自带浏览器、Chrome 或 Safari 打开。");
    return;
  }
  speechWindow.speechSynthesis.cancel();
  const utterance = new speechWindow.SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.82;
  speechWindow.speechSynthesis.speak(utterance);
}

function usePracticeTimer(minimumDuration: number, onProgress: (outcome: TaskOutcome) => void) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || elapsed >= minimumDuration) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [running, elapsed, minimumDuration]);
  useEffect(() => {
    const ready = elapsed >= minimumDuration;
    onProgress({ ready, durationSeconds: elapsed, attempts: 1, wrongQuestions: [], message: ready ? "有效练习时间已达标。" : undefined });
    if (ready) setRunning(false);
  }, [elapsed, minimumDuration, onProgress]);
  return { elapsed, running, setRunning };
}

function TimerControl({ elapsed, minimumDuration, running, onToggle }: { elapsed: number; minimumDuration: number; running: boolean; onToggle: () => void }) {
  const remaining = Math.max(0, minimumDuration - elapsed);
  return (
    <article className="timer-panel panel">
      <div><Clock3 size={22} /><strong>有效练习计时</strong></div>
      <div className="timer">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</div>
      <button className="primary" disabled={remaining === 0} onClick={onToggle}>{remaining === 0 ? "计时完成" : running ? "暂停" : "开始计时"}</button>
    </article>
  );
}

function MorningReading({ dateKey, minimumDuration, onProgress }: { dateKey: string; minimumDuration: number; onProgress: (outcome: TaskOutcome) => void }) {
  const content = getWeeklyContent(dateFromKey(dateKey));
  const poem = chineseReadings[Math.floor(dateFromKey(dateKey).getDate() / 7) % chineseReadings.length];
  const timer = usePracticeTimer(minimumDuration, onProgress);
  return (
    <div className="panel-list">
      <TimerControl elapsed={timer.elapsed} minimumDuration={minimumDuration} running={timer.running} onToggle={() => timer.setRunning(!timer.running)} />
      <div className="content-grid">
        <article className="panel"><h3>{poem.title}</h3><p className="muted">{poem.author} · 公版古诗</p>{poem.lines.map((line) => <p className="poem-line" key={line}>{line}</p>)}<button className="secondary" onClick={() => speak(poem.lines.join(""))}><Play size={16} />跟读播放</button></article>
        <article className="panel"><h3>{content.readingTitle}</h3><p>{content.readingText}</p><p className="muted">本周生字：{content.words.map((item) => `${item.word}-${item.group}`).join("、")}</p><button className="secondary" onClick={() => speak(content.readingText)}><Play size={16} />课文跟读</button></article>
      </div>
    </div>
  );
}

function CopybookPreview({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const content = getWeeklyContent(dateFromKey(dateKey));
  const [done, setDone] = useState(false);
  useEffect(() => onProgress({ ready: done, durationSeconds: 0, attempts: 1, wrongQuestions: [], message: done ? "练字记录完成，请家长确认。" : undefined }), [done, onProgress]);
  return (
    <div className="panel-list">
      <div className="content-grid">{content.words.map((item) => <article className="word-card" key={item.word}><strong>{item.word}</strong><p>{item.pinyin}</p><p>{item.strokes}</p><p>{item.group}</p></article>)}</div>
      <label className="confirm-check panel"><input type="checkbox" checked={done} onChange={(event) => setDone(event.target.checked)} />我已经每个字认真练写3遍</label>
    </div>
  );
}

function Memorize({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const passages = getWeeklyContent(dateFromKey(dateKey)).memorization;
  const [passed, setPassed] = useState<boolean[]>(passages.map(() => false));
  const ready = passed.every(Boolean);
  useEffect(() => onProgress({ ready, durationSeconds: 0, attempts: 1, wrongQuestions: [], message: ready ? "背诵闯关完成，请家长确认。" : undefined }), [ready, onProgress]);
  return <div className="panel-list">{passages.map((line, index) => <article className="panel" key={line}><h3>第{index + 1}关</h3><p className="poem-line">{line}</p><div className="inline-actions"><button className="secondary" onClick={() => speak(line)}><Play size={16} />听一遍</button><label className="mini-check"><input type="checkbox" checked={passed[index]} onChange={(event) => setPassed(passed.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))} />已背会</label></div></article>)}</div>;
}

function Dictation({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const words = getWeeklyContent(dateFromKey(dateKey)).dictation;
  const [index, setIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const current = words[index];
  const playCurrent = () => speak(`请写：${current}`);
  const next = () => {
    if (index >= words.length - 1) setShowAnswers(true);
    else {
      setIndex(index + 1);
      window.setTimeout(() => speak(`请写：${words[index + 1]}`), 250);
    }
  };
  useEffect(() => onProgress({ ready: showAnswers, durationSeconds: 0, attempts: 1, wrongQuestions: [], message: showAnswers ? "听写全部播报完成，请核对后由家长确认。" : undefined }), [showAnswers, onProgress]);
  return <div className="panel dictation"><h3>语音听写</h3><p>当前第 {index + 1} / {words.length} 个。播放后留出书写时间，可重复播放。</p><div className="dictation-word">{showAnswers ? "答案已显示" : "请听语音写词语"}</div><div className="inline-actions"><button className="primary" onClick={playCurrent}><Play size={16} />播放词语</button><button className="secondary" onClick={playCurrent}><RotateCcw size={16} />重复播放</button><button className="secondary" onClick={next}>{index >= words.length - 1 ? "显示答案" : "下一个"}</button></div>{showAnswers ? <p className="answer-strip">{words.join("　")}</p> : null}</div>;
}

function NightReading({ dateKey, minimumDuration, onProgress }: { dateKey: string; minimumDuration: number; onProgress: (outcome: TaskOutcome) => void }) {
  const content = getWeeklyContent(dateFromKey(dateKey));
  const timer = usePracticeTimer(minimumDuration, onProgress);
  return <div className="panel-list"><TimerControl elapsed={timer.elapsed} minimumDuration={minimumDuration} running={timer.running} onToggle={() => timer.setRunning(!timer.running)} /><article className="panel"><h3>{content.readingTitle}</h3><p>{content.readingText}</p><button className="secondary" onClick={() => speak(content.readingText)}><Play size={16} />听读文本</button></article></div>;
}

function PictureWriting({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const picture = getWeeklyContent(dateFromKey(dateKey)).picture;
  const [text, setText] = useState("");
  const ready = text.replace(/\s/g, "").length >= 10;
  useEffect(() => onProgress({ ready, durationSeconds: 0, attempts: 1, wrongQuestions: [], message: ready ? "已经写够2–4句话，请家长阅读确认。" : undefined }), [ready, onProgress]);
  return <div className="panel"><h3>情景：{picture.title}</h3><div className="picture-scene">{picture.scene}</div><p>提示词：{picture.hints}</p><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="写2–4句话，先写看到了什么，再写大家在做什么。" /><details><summary>完成后查看范文</summary><p>{picture.example}</p></details></div>;
}

function ReadingComprehensionPanel({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const date = dateFromKey(dateKey);
  const weekNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 604800000);
  const item = readingComprehensions[weekNumber % readingComprehensions.length];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const check = () => {
    const correct = item.questions.filter((question) => question.options ? answers[question.id] === question.answer : Boolean(answers[question.id]?.trim())).length;
    const score = Math.round((correct / item.questions.length) * 100);
    const nextAttempts = attempts + 1;
    setChecked(true);
    setAttempts(nextAttempts);
    onProgress({ ready: score >= 80, score, durationSeconds: 0, attempts: nextAttempts, wrongQuestions: item.questions.filter((question) => question.options ? answers[question.id] !== question.answer : !answers[question.id]?.trim()).map((question) => question.prompt), message: score >= 80 ? `正确率${score}%，已经达标。` : `正确率${score}%，再试一次会更好。` });
  };
  return <div className="panel"><h3>{item.title}</h3>{item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{item.questions.map((question) => <div className="question" key={question.id}><p>{question.prompt}</p>{question.options ? question.options.map((option) => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers({ ...answers, [question.id]: option })} />{option}</label>) : <input value={answers[question.id] ?? ""} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} placeholder="用一句话回答" />}{checked ? <p className="answer">答案：{question.answer}。{question.explanation}</p> : null}</div>)}<button className="secondary" onClick={check}>核对答案解析</button></div>;
}

function Arithmetic({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const questions = useMemo(() => generateArithmetic(dateKey, 20), [dateKey]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [retryIndices, setRetryIndices] = useState<number[]>([]);
  const displayedIndices = retryIndices.length ? retryIndices : questions.map((_, index) => index);
  const check = () => {
    const wrong = questions.map((question, index) => Number(answers[index]) === question.answer ? -1 : index).filter((index) => index >= 0);
    const score = Math.round(((questions.length - wrong.length) / questions.length) * 100);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setChecked(true);
    setRetryIndices(wrong);
    onProgress({ ready: score >= 80, score, durationSeconds: 0, attempts: nextAttempts, wrongQuestions: wrong.map((index) => questions[index].prompt), message: score >= 80 ? `正确率${score}%，已经达标。错题可以继续重练。` : `正确率${score}%，请完成下面的错题重练。` });
  };
  return <div className="panel"><h3>{retryIndices.length ? `错题专项重练 ${retryIndices.length}道` : "100以内正整数加减法 20道"}</h3><div className="arithmetic-grid">{displayedIndices.map((index) => { const question = questions[index]; return <label key={`${question.prompt}-${index}`}><span>{question.prompt}</span><input inputMode="numeric" value={answers[index] ?? ""} onChange={(event) => setAnswers({ ...answers, [index]: event.target.value.replace(/\D/g, "") })} />{checked ? <b>{question.answer}</b> : null}</label>; })}</div><button className="primary" onClick={check}>{attempts ? "重新核对" : "核对答案"}</button></div>;
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s/g, "");
}

function answerMatches(input: string, answer: string) {
  const normalizedInput = normalizeAnswer(input);
  const normalizedAnswer = normalizeAnswer(answer);
  const numeric = normalizedAnswer.match(/^\d+/)?.[0];
  return normalizedInput === normalizedAnswer || (numeric !== undefined && normalizedInput === numeric);
}

function AutoPractice({ title, items, onProgress }: { title: string; items: string[][]; onProgress: (outcome: TaskOutcome) => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const check = () => {
    const wrong = items.map(([prompt, answer], index) => answerMatches(answers[index] ?? "", answer) ? "" : prompt).filter(Boolean);
    const score = Math.round(((items.length - wrong.length) / items.length) * 100);
    const nextAttempts = attempts + 1;
    setChecked(true);
    setAttempts(nextAttempts);
    onProgress({ ready: score >= 80, score, durationSeconds: 0, attempts: nextAttempts, wrongQuestions: wrong, message: score >= 80 ? `正确率${score}%，已经达标。` : `正确率${score}%，再试一次会更好。` });
  };
  return <div className="panel"><h3>{title}</h3>{items.map(([prompt, answer], index) => <div className="question" key={`${prompt}-${index}`}><p>{prompt}</p><input value={answers[index] ?? ""} onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })} placeholder="写答案" />{checked ? <p className="answer">答案：{answer}</p> : null}</div>)}<button className="secondary" onClick={check}>{attempts ? "重新核对" : "核对答案"}</button></div>;
}

function MultiplyDivide({ onProgress }: { onProgress: (outcome: TaskOutcome) => void }) {
  return <AutoPractice title="口诀入门" onProgress={onProgress} items={[["二三得六，写出算式", "2×3=6"], ["三四十二，写出算式", "3×4=12"], ["4 × 5 =", "20"], ["12 ÷ 3 =", "4"], ["18 ÷ 6 =", "3"]]} />;
}

function WordProblems({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const offset = dateFromKey(dateKey).getDate() % wordProblems.length;
  const items = [...wordProblems.slice(offset), ...wordProblems.slice(0, offset)].slice(0, 5).map((item) => [item.prompt, item.answer]);
  return <AutoPractice title="生活化应用题" items={items} onProgress={onProgress} />;
}

function EnglishDaily({ dateKey, minimumDuration, onProgress }: { dateKey: string; minimumDuration: number; onProgress: (outcome: TaskOutcome) => void }) {
  const lesson = getWeeklyContent(dateFromKey(dateKey)).english;
  const timer = usePracticeTimer(minimumDuration, onProgress);
  return (
    <div className="panel-list">
      <TimerControl elapsed={timer.elapsed} minimumDuration={minimumDuration} running={timer.running} onToggle={() => timer.setRunning(!timer.running)} />
      <article className="panel english-lesson-head">
        <p className="eyebrow">译林版二年级上册主题预习 · 原创例句</p>
        <h3>{lesson.unit} · {lesson.title}</h3>
        <p>本周主题：{lesson.topic}</p>
      </article>
      <article className="panel">
        <h3>核心单词与例句</h3>
        {lesson.words.map((item) => (
          <div className="english-line" key={item.word}>
            <div><strong>{item.word}</strong><span>{item.meaning}</span><p>{item.sentence}</p></div>
            <div className="inline-actions">
              <button className="secondary" onClick={() => speak(item.word, "en-US")}><Play size={16} />单词</button>
              <button className="secondary" onClick={() => speak(item.sentence, "en-US")}><Play size={16} />例句</button>
            </div>
          </div>
        ))}
      </article>
      <article className="panel">
        <h3>核心句型</h3>
        <div className="english-patterns">
          {lesson.patterns.map((pattern) => (
            <div key={pattern.sentence}>
              <p><strong>{pattern.sentence}</strong></p>
              <p>{pattern.meaning}</p>
              <button className="secondary" onClick={() => speak(pattern.sentence, "en-US")}><Play size={16} />听句型</button>
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <h3>今日跟读任务</h3>
        <ol className="practice-steps">{lesson.tasks.map((task) => <li key={task}>{task}</li>)}</ol>
      </article>
    </div>
  );
}

function GameTask({ taskId, dateKey, onProgress }: { taskId: string; dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const challenge = getGameChallenge(taskId, dateFromKey(dateKey));
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const choose = (option: string) => {
    setAnswer(option);
    const correct = option === challenge.answer;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    onProgress({ ready: correct, score: correct ? 100 : 0, durationSeconds: 0, attempts: nextAttempts, wrongQuestions: correct ? [] : [challenge.question], message: correct ? "闯关成功，可以领取积分。" : "再试一次，你会找到答案的。" });
  };
  return <div className="panel"><h3>{challenge.question}</h3><div className="option-row">{challenge.options.map((option) => <button className={answer === option ? "selected" : "secondary"} key={option} onClick={() => choose(option)}>{option}</button>)}</div>{answer ? <p className={answer === challenge.answer ? "answer" : "gentle-retry"}>{answer === challenge.answer ? "闯关成功！" : "再试一次，你会找到答案的。"}</p> : null}</div>;
}

function SportTask({ taskId, onProgress }: { taskId: string; onProgress: (outcome: TaskOutcome) => void }) {
  const config = taskId === "sport-rope" ? { title: "跳绳500个", target: 500, unit: "个" } : taskId === "sport-high-jump" ? { title: "摸高跳200个", target: 200, unit: "个" } : { title: "累计运动60分钟", target: 60, unit: "分钟" };
  const [value, setValue] = useState("");
  const ready = Number(value) >= config.target;
  useEffect(() => onProgress({ ready, durationSeconds: taskId === "sport-hour" ? Number(value) * 60 : 0, attempts: 1, wrongQuestions: [], message: ready ? "运动目标达成，请家长确认。" : undefined }), [ready, value, taskId, onProgress]);
  return <div className="panel"><h3>{config.title}</h3><p>运动前先热身，完成后由家长确认数量或时长。动作不舒服时应立即停止。</p><label>完成数量或时长（{config.unit}）<input className="wide-input" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))} placeholder={`目标${config.target}${config.unit}`} /></label></div>;
}

function ShopPage({ state, setState, streak }: { state: WorkspaceState; setState: (state: WorkspaceState) => void; streak: number }) {
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [message, setMessage] = useState("");
  const report = getWeeklyReport(state);
  const badges = unlockedBadges(streak);
  const weekend = isWeekend();

  const applyReward = (reward: (typeof shopRewards)[number]) => {
    const next = requestReward(state, { id: reward.id, name: reward.name, cost: reward.costStars });
    if (!next) setMessage(weekend ? "积分不足，或已经有同类申请等待处理。" : "周六、周日开放集中兑换。");
    else { setState(next); setMessage("兑换申请已提交，请家长确认。 "); }
  };
  const approve = (requestId: string) => {
    const next = approveReward(state, requestId, pin);
    if (!next) setMessage("家长口令不正确，或当前积分不足。");
    else { setState(next); setMessage("家长已批准，积分已扣除。 "); }
  };
  const fulfill = (requestId: string) => {
    const next = fulfillReward(state, requestId, pin);
    if (!next) setMessage("请输入正确的家长口令。");
    else { setState(next); setMessage("奖励已经兑现并记录。 "); }
  };
  const changePin = () => {
    const next = updateParentPin(state, currentPin, nextPin);
    if (!next) setMessage("当前口令不正确，或新口令不是四位数字。");
    else { setState(next); setCurrentPin(""); setNextPin(""); setMessage("家长口令已更新。 "); }
  };
  const applyAdjustment = () => {
    const next = adjustPoints(state, Number(adjustment), pin);
    if (!next) setMessage("请输入正确口令和非零整数积分。");
    else { setState(next); setAdjustment(""); setMessage("积分调整完成。 "); }
  };

  return (
    <section>
      <div className="section-title"><ShoppingBag size={42} /><div><p className="eyebrow">每周集中兑换 · 实物奖励由家长兑现</p><h2>积分兑换商店</h2></div></div>
      <div className="shop-grid">{shopRewards.map((reward) => <article className="task-card" key={reward.id}><div className="reward-icon">{reward.emoji}</div><div><h3>{reward.name}</h3><p>{reward.description}</p><p className="task-meta">{reward.costStars}积分</p></div><button className="primary" disabled={state.points < reward.costStars || !weekend} onClick={() => applyReward(reward)}><Gift size={16} />{weekend ? "申请兑换" : "周末开放"}</button></article>)}</div>
      <div className="history-layout">
        <article className="panel"><h3><BarChart3 size={20} /> 本周学习报告</h3><p>完成学习：{report.completedDays}天</p><p>累计有效时长：{Math.round(report.totalDurationSeconds / 60)}分钟</p><p>口算平均正确率：{report.arithmeticAverage || "暂无"}{report.arithmeticAverage ? "%" : ""}</p><p>本周获得积分：{report.earnedPoints}</p><p>本周错题：{report.wrongQuestions.length ? report.wrongQuestions.slice(0, 5).join("、") : "暂无"}</p></article>
        <article className="panel"><h3><Trophy size={20} /> 坚持勋章</h3><div className="badge-row">{[7, 14, 30].map((days) => <span className={badges.includes(days) ? "badge unlocked" : "badge"} key={days}>{days}天</span>)}</div><p>{badges.length ? `已解锁${badges.join("天、")}天坚持勋章。` : `还差${Math.max(0, 7 - streak)}天解锁第一枚勋章。`}</p><div className="calendar">{state.completedDates.slice(-14).map((value) => <span key={value}>{formatDate(value)}</span>)}</div></article>
      </div>
      <article className="panel parent-zone"><h3><LockKeyhole size={20} /> 家长处理区</h3><p>初始家长口令为 {DEFAULT_PARENT_PIN}。首次使用后请修改。所有数据只保存在当前设备。</p><input className="pin-input" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="处理申请的四位口令" />{message ? <p className="answer">{message}</p> : null}<div className="request-list">{state.rewardRequests.length ? state.rewardRequests.map((request) => <div className="request-row" key={request.id}><span>{request.rewardName} · {request.cost}积分 · {request.status === "pending" ? "待批准" : request.status === "approved" ? "待兑现" : "已兑现"}</span>{request.status === "pending" ? <button className="secondary" onClick={() => approve(request.id)}>家长批准</button> : null}{request.status === "approved" ? <button className="secondary" onClick={() => fulfill(request.id)}>确认已兑现</button> : null}</div>) : <p className="muted">暂无兑换申请。</p>}</div><div className="parent-tools"><div><h3>调整积分</h3><input value={adjustment} onChange={(event) => setAdjustment(event.target.value.replace(/[^\d-]/g, ""))} placeholder="例如 10 或 -5" /><button className="secondary" onClick={applyAdjustment}>确认调整</button></div><div><h3>修改家长口令</h3><input inputMode="numeric" maxLength={4} value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="当前口令" /><input inputMode="numeric" maxLength={4} value={nextPin} onChange={(event) => setNextPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="新四位口令" /><button className="secondary" onClick={changePin}>更新口令</button></div></div></article>
    </section>
  );
}
