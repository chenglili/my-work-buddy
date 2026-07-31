import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  getGameChallenges,
  getStudySchedule,
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
  approveAllTaskReviews,
  approveReward,
  approveTaskReview,
  calculateStreak,
  completeTask,
  fulfillReward,
  getDailyReport,
  getMonthlyReport,
  getWeeklyReport,
  isWeekend,
  readStoredState,
  rejectTaskReview,
  refreshDailyState,
  requestReward,
  STORAGE_KEY,
  submitTaskReview,
  unlockedBadges,
  verifyParentPin,
  type CompletionResultInput,
  type PendingTaskReview,
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
  const [parentSession, setParentSession] = useState<{ dateKey: string; pin: string } | null>(null);
  const returnTaskId = useRef<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => setState((current) => refreshDailyState(current)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setParentSession((current) => current?.dateKey === state.dateKey ? current : null);
  }, [state.dateKey]);

  useEffect(() => {
    if (!route.taskId && returnTaskId.current) {
      const taskId = returnTaskId.current;
      returnTaskId.current = null;
      window.requestAnimationFrame(() => {
        document.querySelector(`[data-task-id="${taskId}"]`)?.scrollIntoView({ block: "center", behavior: "auto" });
      });
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route.view, route.taskId]);

  const currentDate = dateFromKey(state.dateKey);
  const requiredTaskIds = getDailyTaskIds(currentDate);
  const completedRequired = requiredTaskIds.filter((id) => state.completedTaskIds.includes(id)).length;
  const progress = Math.round((completedRequired / requiredTaskIds.length) * 100);
  const streak = calculateStreak(state.completedDates);
  const currentTask = route.taskId ? taskCatalog.find((task) => task.id === route.taskId) : undefined;

  const markTaskDone = (task: TaskDefinition, outcome: TaskOutcome) => {
    if (task.completionMode !== "auto") {
      const nextState = submitTaskReview(state, task, outcome);
      setState(nextState);
      setToast(`${task.shortTitle}已提交，等待家长今天统一审核。`);
      return;
    }
    const beforeBonus = state.bonusAwarded;
    const nextState = completeTask(state, task.id, task.points, requiredTaskIds, outcome);
    setState(nextState);
    setToast(`${task.shortTitle}完成，获得${task.points}积分。${encouragements[state.taskResults.length % encouragements.length]}`);
    if (!beforeBonus && nextState.bonusAwarded) setShowVictory(true);
  };

  const navigate = (view: ViewKey) => {
    returnTaskId.current = null;
    setRoute({ view });
  };
  const openTask = (taskId: string) => setRoute({ view: taskCatalog.find((task) => task.id === taskId)?.category ?? "home", taskId });
  const returnToSection = () => {
    if (!currentTask) return;
    returnTaskId.current = currentTask.id;
    setRoute({ view: currentTask.category });
  };

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
              <span className="nav-mobile-label">{sectionMeta[key].mobileLabel}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <TopBar points={state.points} progress={progress} completedCount={completedRequired} requiredCount={requiredTaskIds.length} streak={streak} backLabel={currentTask ? `返回${sectionMeta[currentTask.category].label}` : undefined} onBack={currentTask ? returnToSection : undefined} />
        {toast ? <div className="toast" onAnimationEnd={() => setToast("")}>{toast}</div> : null}

        {currentTask ? (
          <TaskPage task={currentTask} completed={state.completedTaskIds.includes(currentTask.id)} pending={state.pendingTaskReviews.some((review) => review.taskId === currentTask.id)} dateKey={state.dateKey} onDone={(outcome) => markTaskDone(currentTask, outcome)} />
        ) : route.view === "home" ? (
          <HomePage state={state} requiredTaskIds={requiredTaskIds} onOpenTask={openTask} />
        ) : route.view === "shop" ? (
          <ShopPage state={state} setState={setState} streak={streak} requiredTaskIds={requiredTaskIds} parentSession={parentSession} setParentSession={setParentSession} onVictory={() => setShowVictory(true)} />
        ) : (
          <SectionPage view={route.view} completedIds={state.completedTaskIds} pendingIds={state.pendingTaskReviews.map((review) => review.taskId)} requiredTaskIds={requiredTaskIds} dateKey={state.dateKey} onOpenTask={openTask} />
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

function TopBar({ points, progress, completedCount, requiredCount, streak, backLabel, onBack }: { points: number; progress: number; completedCount: number; requiredCount: number; streak: number; backLabel?: string; onBack?: () => void }) {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        {onBack ? <button className="task-back-button" onClick={onBack} aria-label={backLabel}><ArrowLeft size={20} /><span>{backLabel}</span></button> : null}
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
  const schedule = getStudySchedule(dateFromKey(state.dateKey));

  return (
    <section>
      <div className="home-hero">
        <img src={characterImages["hello-kitty"]} alt="" />
        <div>
          <p className="eyebrow">{curriculumNote}</p>
          <h2>今日任务 · {weekContent.theme}</h2>
          <p>{schedule.dateRange} · 今天是“{schedule.stageLabel}”阶段{schedule.daysUntilSchool ? ` · 距9月1日开学${schedule.daysUntilSchool}天` : ""}</p>
          <p>完成今天{requiredTaskIds.length}项必做任务可获得额外15积分，预计总用时60–90分钟。</p>
        </div>
      </div>
      <article className="weekly-goal">
        <div><strong>本周目标</strong><span>{report.earnedPoints} / {weeklyTarget} 积分</span></div>
        <div className="progress-track" aria-label={`本周进度${weeklyProgress}%`}><span style={{ width: `${weeklyProgress}%` }} /></div>
        <p>{report.earnedPoints >= weeklyTarget ? "本周小玩具目标已经达成，周末请家长确认兑换。" : `再获得${weeklyTarget - report.earnedPoints}积分，就达到小玩具周目标。`}</p>
      </article>
      <TaskGrid tasks={dailyTasks} completedIds={state.completedTaskIds} pendingIds={state.pendingTaskReviews.map((review) => review.taskId)} requiredTaskIds={requiredTaskIds} onOpenTask={onOpenTask} />
      <div className="section-title compact-title">
        <Trophy size={34} />
        <div><h2>奖励小游戏</h2><p>{requiredDone ? "今日计划完成，小游戏已解锁。" : "完成今日计划后解锁，不影响全通关。"}</p></div>
      </div>
      <TaskGrid tasks={optionalTasks} completedIds={state.completedTaskIds} pendingIds={state.pendingTaskReviews.map((review) => review.taskId)} requiredTaskIds={requiredTaskIds} onOpenTask={onOpenTask} locked={!requiredDone} />
    </section>
  );
}

function SectionPage({ view, completedIds, pendingIds, requiredTaskIds, dateKey, onOpenTask }: { view: TaskCategory; completedIds: string[]; pendingIds: string[]; requiredTaskIds: string[]; dateKey: string; onOpenTask: (taskId: string) => void }) {
  const tasks = taskCatalog.filter((task) => task.category === view);
  const meta = sectionMeta[view];
  const gamesLocked = view === "game" && !requiredTaskIds.every((id) => completedIds.includes(id));
  return (
    <section>
      <div className="section-title">
        <img src={characterImages[meta.character]} alt="" />
        <div><p className="eyebrow">{curriculumNote}</p><h2>{meta.label}</h2></div>
      </div>
      {view === "chinese" || view === "math" || view === "english" ? <SubjectDashboard view={view} dateKey={dateKey} tasks={tasks} completedIds={completedIds} /> : null}
      <TaskGrid tasks={tasks} completedIds={completedIds} pendingIds={pendingIds} requiredTaskIds={requiredTaskIds} onOpenTask={onOpenTask} locked={gamesLocked} />
    </section>
  );
}

function SubjectDashboard({ view, dateKey, tasks, completedIds }: { view: "chinese" | "math" | "english"; dateKey: string; tasks: TaskDefinition[]; completedIds: string[] }) {
  const content = getWeeklyContent(dateFromKey(dateKey));
  const schedule = getStudySchedule(dateFromKey(dateKey));
  const completed = tasks.filter((task) => completedIds.includes(task.id)).length;
  const progress = Math.round((completed / tasks.length) * 100);
  const details = view === "chinese"
    ? { title: `第${schedule.unitIndex + 1}阶段 · ${content.readingTitle}`, focus: `会读会用：${content.words.map((item) => item.word).join("、")}`, steps: ["先听读", "圈重点", "开口说", "认真写"] }
    : view === "math"
      ? { title: `第${schedule.unitIndex + 1}阶段 · 苏教版基础闯关`, focus: schedule.unitIndex < 2 ? "100以内加减法，算得对也要检查" : schedule.unitIndex < 5 ? "乘法口诀1–6，理解几个几" : "生活应用题，先找条件再列式", steps: ["读清题", "动笔算", "检查答", "重练错题"] }
      : { title: `${content.english.unit} · ${content.english.title}`, focus: `${content.english.topic}：${content.english.words.map((item) => item.word).join("、")}`, steps: ["听单词", "跟读句", "辨一辨", "大胆说"] };

  return (
    <article className={`subject-dashboard ${view}`}>
      <div className="subject-focus"><span>{schedule.dateRange} · {schedule.stageLabel}</span><h3>{details.title}</h3><p>{details.focus}</p></div>
      <div className="subject-path" aria-label="学习步骤">{details.steps.map((step, index) => <span key={step}><b>{index + 1}</b>{step}</span>)}</div>
      <div className="subject-progress"><div><strong>今日专区进度</strong><span>{completed}/{tasks.length}</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>{completed ? `已经完成${completed}项，每一步都算数。` : "选一项开始，完成后就能点亮进度。"}</p></div>
    </article>
  );
}

function TaskGrid({ tasks, completedIds, pendingIds, requiredTaskIds, onOpenTask, locked = false }: { tasks: TaskDefinition[]; completedIds: string[]; pendingIds: string[]; requiredTaskIds: string[]; onOpenTask: (taskId: string) => void; locked?: boolean }) {
  return (
    <div className="task-grid">
      {tasks.map((task) => {
        const completed = completedIds.includes(task.id);
        const pending = pendingIds.includes(task.id);
        const required = requiredTaskIds.includes(task.id);
        return (
          <article className={completed ? "task-card completed" : pending ? "task-card pending" : "task-card"} key={task.id} data-task-id={task.id}>
            <img src={characterImages[task.character]} alt="" />
            <div>
              <p className="task-meta">{pending ? "待家长审核" : required ? "今日必做" : task.schedule === "optional" ? "奖励任务" : "本周轮换"} · {task.minutes} · +{task.points}</p>
              <h3>{task.title}</h3>
              <p>{task.summary}</p>
            </div>
            <div className="card-actions">
              <button className="secondary" disabled={locked} onClick={() => onOpenTask(task.id)}>{locked ? <LockKeyhole size={16} /> : pending ? <Clock3 size={16} /> : <Play size={16} />}{locked ? "完成计划后解锁" : pending ? "查看提交" : completed ? "查看练习" : "开始挑战"}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TaskPage({ task, completed, pending, dateKey, onDone }: { task: TaskDefinition; completed: boolean; pending: boolean; dateKey: string; onDone: (outcome: TaskOutcome) => void }) {
  const [outcome, setOutcome] = useState<TaskOutcome>(completed ? { ...emptyOutcome, ready: true } : emptyOutcome);
  const startedAt = useRef(Date.now());
  useEffect(() => {
    setOutcome(completed ? { ...emptyOutcome, ready: true } : emptyOutcome);
    startedAt.current = Date.now();
  }, [task.id, completed]);

  const canComplete = outcome.ready && !completed && !pending;

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
      <div className="finish-bar">
        <p className={outcome.ready ? "answer" : "muted"}>{completed ? "今天已经获得过这项积分。" : pending ? "已经提交到今日家长审核，批准后自动发放积分。" : outcome.message ?? completionHint(task)}</p>
        <button className="primary big" disabled={!canComplete} onClick={() => onDone({
          ...outcome,
          durationSeconds: Math.max(outcome.durationSeconds ?? 0, Math.round((Date.now() - startedAt.current) / 1000)),
        })}>
          <CheckCircle2 size={20} />{completed ? "今天已完成" : pending ? "等待家长审核" : task.completionMode === "auto" ? `完成任务 +${task.points}` : "提交家长审核"}
        </button>
      </div>
    </section>
  );
}

function completionHint(task: TaskDefinition) {
  if (task.completionMode === "timer") return `有效练习达到${Math.round((task.minimumDuration ?? 0) / 60)}分钟后可提交家长审核。`;
  if (task.completionMode === "parent") return "先完成练习要求，再提交到今日家长审核。";
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
    case "math-multiply-divide": return <MultiplyDivide dateKey={dateKey} onProgress={onProgress} />;
    case "math-word-problems": return <WordProblems dateKey={dateKey} onProgress={onProgress} />;
    case "english-daily": return <EnglishDaily dateKey={dateKey} minimumDuration={minimumDuration} onProgress={onProgress} />;
    case "sport-rope":
    case "sport-high-jump":
    case "sport-hour": return <SportTask taskId={task.id} onProgress={onProgress} />;
    default: return <GameTask key={`${task.id}-${dateKey}`} taskId={task.id} dateKey={dateKey} onProgress={onProgress} />;
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
  const voices = speechWindow.speechSynthesis.getVoices();
  const languageVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const preferredNames = lang.startsWith("zh")
    ? ["Xiaoxiao", "晓晓", "Ting-Ting", "Mei-Jia", "Yaoyao", "Huihui", "Google 普通话"]
    : ["Jenny", "Samantha", "Aria", "Ava", "Google US English"];
  utterance.voice = preferredNames.map((name) => languageVoices.find((voice) => voice.name.includes(name))).find(Boolean) ?? languageVoices[0] ?? null;
  utterance.rate = lang.startsWith("zh") ? 0.74 : 0.8;
  utterance.pitch = lang.startsWith("zh") ? 1.08 : 1.03;
  utterance.volume = 1;
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
    onProgress({ ready, durationSeconds: elapsed, attempts: 1, wrongQuestions: [], evidence: `有效计时${Math.floor(elapsed / 60)}分${elapsed % 60}秒`, message: ready ? "有效练习时间已达标，可以提交家长审核。" : undefined });
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
        <article className="panel"><h3>{poem.title}</h3><p className="muted">{poem.author} · 公版古诗</p>{poem.lines.map((line) => <p className="poem-line" key={line}>{line}</p>)}<p className="reading-tip">朗读小提示：{poem.readingTip}</p><div className="focus-chips">{poem.focus.map((word) => <span key={word}>{word}</span>)}</div><button className="secondary" onClick={() => speak(poem.lines.join(""))}><Play size={16} />跟读播放</button></article>
        <article className="panel"><h3>{content.readingTitle}</h3><p>{content.readingText}</p><p className="muted">本周生字：{content.words.map((item) => `${item.word}-${item.group}`).join("、")}</p><button className="secondary" onClick={() => speak(content.readingText)}><Play size={16} />课文跟读</button></article>
      </div>
    </div>
  );
}

function CopybookPreview({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const content = getWeeklyContent(dateFromKey(dateKey));
  const [done, setDone] = useState(false);
  useEffect(() => onProgress({ ready: done, durationSeconds: 0, attempts: 1, wrongQuestions: [], evidence: done ? `${content.words.length}个字，每字练写3遍` : undefined, message: done ? "练字记录完成，可以提交家长审核。" : undefined }), [done, content.words.length, onProgress]);
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
  useEffect(() => onProgress({ ready, durationSeconds: 0, attempts: 1, wrongQuestions: [], evidence: `已勾选${passed.filter(Boolean).length}/${passages.length}段`, message: ready ? "背诵闯关完成，可以提交家长审核。" : undefined }), [ready, passed, passages.length, onProgress]);
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
  useEffect(() => onProgress({ ready: showAnswers, durationSeconds: 0, attempts: 1, wrongQuestions: [], evidence: showAnswers ? `已完成${words.length}个词语听写并核对` : undefined, message: showAnswers ? "听写全部播报完成，可以提交家长审核。" : undefined }), [showAnswers, words.length, onProgress]);
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
  useEffect(() => onProgress({ ready, durationSeconds: 0, attempts: 1, wrongQuestions: [], evidence: ready ? `看图写话${text.replace(/\s/g, "").length}字` : undefined, message: ready ? "已经写够2–4句话，可以提交家长审核。" : undefined }), [ready, text, onProgress]);
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

function MultiplyDivide({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const daySeed = Math.floor(Date.UTC(dateFromKey(dateKey).getFullYear(), dateFromKey(dateKey).getMonth(), dateFromKey(dateKey).getDate()) / 86400000);
  const facts = Array.from({ length: 30 }, (_, index) => ({ first: 1 + (index % 6), second: 1 + Math.floor(index / 6) }));
  const selected = Array.from({ length: 5 }, (_, index) => facts[(daySeed * 5 + index) % facts.length]);
  const items = selected.flatMap(({ first, second }) => [
    [`${first} × ${second} =`, String(first * second)],
    [`${first * second} ÷ ${first} =`, String(second)],
  ]);
  return <AutoPractice title="1–6乘法口诀 · 每日10题" onProgress={onProgress} items={items} />;
}

function WordProblems({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const offset = (Math.floor(Date.UTC(dateFromKey(dateKey).getFullYear(), dateFromKey(dateKey).getMonth(), dateFromKey(dateKey).getDate()) / 86400000) * 5) % wordProblems.length;
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
      <EnglishListeningGame lesson={lesson} />
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

function EnglishListeningGame({ lesson }: { lesson: ReturnType<typeof getWeeklyContent>["english"] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState(false);
  const [finished, setFinished] = useState(false);
  const word = lesson.words[index];
  const options = useMemo(() => lesson.words.map((item) => item.meaning).sort((a, b) => a.localeCompare(b, "zh-CN")), [lesson]);
  const choose = (meaning: string) => {
    if (selected === word.meaning) return;
    setSelected(meaning);
    if (meaning !== word.meaning) {
      setMissed(true);
      return;
    }
    const nextCorrect = correctCount + (missed ? 0 : 1);
    setCorrectCount(nextCorrect);
    window.setTimeout(() => {
      if (index === lesson.words.length - 1) setFinished(true);
      else {
        setIndex(index + 1);
        setSelected("");
        setMissed(false);
      }
    }, 450);
  };

  return (
    <article className="panel english-listening-game">
      <div className="listening-head"><div><p className="eyebrow">趣味加星 · 不影响计时打卡</p><h3>听音辨词 {Math.min(index + 1, lesson.words.length)}/{lesson.words.length}</h3></div><strong><Star size={18} />{correctCount}</strong></div>
      {finished ? <div className="listening-finish"><img src={characterImages.cinnamoroll} alt="" /><div><h3>听音小挑战完成</h3><p>一次听对 {correctCount} 个。多听一次，耳朵会越来越灵。</p></div></div> : <><button className="primary listen-word" onClick={() => speak(word.word, "en-US")}><Play size={18} />播放第{index + 1}个单词</button><div className="english-quiz-options">{options.map((option) => <button className={selected === option ? (option === word.meaning ? "correct-choice" : "wrong-choice") : "secondary"} key={option} onClick={() => choose(option)}>{option}</button>)}</div>{selected ? <p className={selected === word.meaning ? "answer" : "gentle-retry"}>{selected === word.meaning ? `听对啦：${word.word} 是“${word.meaning}”。` : "再听一次，不着急。"}</p> : null}</>}
    </article>
  );
}

function GameTask({ taskId, dateKey, onProgress }: { taskId: string; dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const challenges = useMemo(() => getGameChallenges(taskId, dateFromKey(dateKey)), [taskId, dateKey]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [roundMissed, setRoundMissed] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(false);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const challenge = challenges[roundIndex];

  const reset = () => {
    setRoundIndex(0);
    setSelected("");
    setRoundMissed(false);
    setRoundCorrect(false);
    setFirstTryCorrect(0);
    setAttempts(0);
    setWrongQuestions([]);
    setCombo(0);
    setFinished(false);
    setFinalScore(0);
    onProgress({ ...emptyOutcome, message: "完成5关，首次答对4关就能获得积分。" });
  };

  const choose = (option: string) => {
    if (roundCorrect || finished || !challenge) return;
    setSelected(option);
    const correct = option === challenge.answer;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (!correct) {
      const nextWrong = roundMissed || wrongQuestions.includes(challenge.question) ? wrongQuestions : [...wrongQuestions, challenge.question];
      setRoundMissed(true);
      setWrongQuestions(nextWrong);
      setCombo(0);
      onProgress({ ready: false, score: Math.round((firstTryCorrect / challenges.length) * 100), durationSeconds: 0, attempts: nextAttempts, wrongQuestions: nextWrong, message: "没关系，看看提示再试一次。" });
      return;
    }

    const nextFirstTryCorrect = firstTryCorrect + (roundMissed ? 0 : 1);
    const nextCombo = roundMissed ? 0 : combo + 1;
    setFirstTryCorrect(nextFirstTryCorrect);
    setCombo(nextCombo);
    setRoundCorrect(true);
    if (roundIndex === challenges.length - 1) {
      const score = Math.round((nextFirstTryCorrect / challenges.length) * 100);
      const ready = score >= 80;
      setFinalScore(score);
      setFinished(true);
      onProgress({ ready, score, durationSeconds: 0, attempts: nextAttempts, wrongQuestions, message: ready ? `首次答对${nextFirstTryCorrect}关，成功获得积分资格！` : `首次答对${nextFirstTryCorrect}关，再玩一次就能进步。` });
    }
  };

  const nextRound = () => {
    setRoundIndex((value) => value + 1);
    setSelected("");
    setRoundMissed(false);
    setRoundCorrect(false);
  };

  if (!challenge) return <div className="panel"><p>今天的游戏关卡正在准备中。</p></div>;

  return (
    <article className={`panel game-arena ${taskId}`}>
      <div className="game-status">
        <div><span>第 {roundIndex + 1} / {challenges.length} 关</span><strong><Star size={18} /> 连对 {combo}</strong></div>
        <div className="game-progress" aria-label={`游戏进度${roundIndex + 1}/${challenges.length}`}>
          {challenges.map((item, index) => <span className={index < roundIndex || finished ? "done" : index === roundIndex ? "current" : ""} key={item.question} />)}
        </div>
      </div>

      {finished ? (
        <div className={finalScore >= 80 ? "game-finish success" : "game-finish"}>
          <img src={characterImages[taskId === "game-number" ? "cinnamoroll" : taskId === "game-hanzi" ? "my-melody" : "kuromi"]} alt="" />
          <h3>{finalScore >= 80 ? "五关挑战成功！" : "已经完成五关啦"}</h3>
          <p>首次作答正确率 {finalScore}% · {firstTryCorrect}/{challenges.length} 关</p>
          {finalScore < 80 ? <button className="primary" onClick={reset}><RotateCcw size={17} />再玩一次</button> : <p className="answer">积分按钮已经解锁，去领取今天的奖励吧。</p>}
        </div>
      ) : (
        <>
          <GameScene taskId={taskId} question={challenge.question} />
          <div className="game-options">
            {challenge.options.map((option) => {
              const choiceClass = selected === option ? (roundCorrect ? "correct-choice" : "wrong-choice") : "";
              return <button className={`game-option ${choiceClass}`} disabled={roundCorrect} key={option} onClick={() => choose(option)}>{option}</button>;
            })}
          </div>
          {selected ? <p className={roundCorrect ? "answer game-feedback" : "gentle-retry game-feedback"}>{roundCorrect ? (roundMissed ? "找到了！认真改正也很棒。" : "一次答对，收下一颗连胜星！") : "再试一次：慢慢读题，答案就在选项里。"}</p> : <p className="muted game-feedback">选一个你认为正确的答案。</p>}
          {roundCorrect && roundIndex < challenges.length - 1 ? <button className="primary game-next" onClick={nextRound}>下一关 <ArrowLeft className="next-arrow" size={18} /></button> : null}
        </>
      )}
    </article>
  );
}

function GameScene({ taskId, question }: { taskId: string; question: string }) {
  if (taskId === "game-hanzi") return <div className="game-scene"><div className="game-character"><img src={characterImages["my-melody"]} alt="" /><span>{question.match(/“(.+?)”/)?.[1]}</span></div><div className="game-baskets"><span>人物篮</span><span>地点篮</span><span>动作篮</span></div></div>;
  if (taskId === "game-number") return <div className="game-scene number-train"><span>数字小火车</span><strong>{question}</strong></div>;
  if (taskId === "game-spot") return <div className="game-scene spot-board"><span>仔细找一找</span><strong>{question.replace(" 中哪一个不同？", "")}</strong></div>;
  return <div className="game-scene logic-board"><img src={characterImages.kuromi} alt="" /><div><span>逻辑侦探线索</span><strong>{question}</strong></div></div>;
}

function SportTask({ taskId, onProgress }: { taskId: string; onProgress: (outcome: TaskOutcome) => void }) {
  const config = taskId === "sport-rope" ? { title: "跳绳500个", target: 500, unit: "个" } : taskId === "sport-high-jump" ? { title: "摸高跳200个", target: 200, unit: "个" } : { title: "累计运动60分钟", target: 60, unit: "分钟" };
  const [value, setValue] = useState("");
  const ready = Number(value) >= config.target;
  useEffect(() => onProgress({ ready, durationSeconds: taskId === "sport-hour" ? Number(value) * 60 : 0, attempts: 1, wrongQuestions: [], evidence: value ? `填写完成${value}${config.unit}` : undefined, message: ready ? "运动目标达成，可以提交家长审核。" : undefined }), [ready, value, taskId, config.unit, onProgress]);
  return <div className="panel"><h3>{config.title}</h3><p>运动前先热身，完成后提交到今日家长审核。动作不舒服时应立即停止。</p><label>完成数量或时长（{config.unit}）<input className="wide-input" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))} placeholder={`目标${config.target}${config.unit}`} /></label></div>;
}

function ShopPage({ state, setState, streak, requiredTaskIds, parentSession, setParentSession, onVictory }: { state: WorkspaceState; setState: (state: WorkspaceState) => void; streak: number; requiredTaskIds: string[]; parentSession: { dateKey: string; pin: string } | null; setParentSession: (session: { dateKey: string; pin: string } | null) => void; onVictory: () => void }) {
  const [shopTab, setShopTab] = useState<"rewards" | "records" | "parent">("rewards");
  const [pin, setPin] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [message, setMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(state.dateKey.slice(0, 7));
  const [reportPeriod, setReportPeriod] = useState<"day" | "week" | "month">("day");
  const parentUnlocked = parentSession?.dateKey === state.dateKey;
  const parentPin = parentSession?.pin ?? pin;
  const reportDate = dateFromKey(state.dateKey);
  const reports = {
    day: getDailyReport(state, reportDate),
    week: getWeeklyReport(state, reportDate),
    month: getMonthlyReport(state, reportDate),
  };
  const report = reports[reportPeriod];
  const badges = unlockedBadges(streak);
  const weekend = isWeekend();
  const rewards = [...shopRewards].sort((first, second) => first.costStars - second.costStars);
  const nextReward = rewards.find((reward) => reward.costStars > state.points) ?? rewards[rewards.length - 1];
  const rewardProgress = Math.min(100, Math.round((state.points / nextReward.costStars) * 100));
  const calendarDays = getMonthCalendar(calendarMonth);
  const [calendarYear, calendarMonthNumber] = calendarMonth.split("-").map(Number);
  const moveCalendar = (offset: number) => {
    const value = new Date(calendarYear, calendarMonthNumber - 1 + offset, 1);
    setCalendarMonth(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`);
  };

  const applyReward = (reward: (typeof shopRewards)[number]) => {
    const next = requestReward(state, { id: reward.id, name: reward.name, cost: reward.costStars });
    if (!next) setMessage(weekend ? "积分不足，或已经有同类申请等待处理。" : "周六、周日开放集中兑换。");
    else { setState(next); setMessage("兑换申请已提交，请家长确认。 "); }
  };
  const approve = (requestId: string) => {
    const next = approveReward(state, requestId, parentPin);
    if (!next) setMessage("家长口令不正确，或当前积分不足。");
    else { setState(next); setMessage("家长已批准，积分已扣除。 "); }
  };
  const fulfill = (requestId: string) => {
    const next = fulfillReward(state, requestId, parentPin);
    if (!next) setMessage("请输入正确的家长口令。");
    else { setState(next); setMessage("奖励已经兑现并记录。 "); }
  };
  const unlockParent = () => {
    if (!verifyParentPin(state, pin, reportDate)) {
      setMessage("口令不正确，请家长再试一次。");
      return;
    }
    setParentSession({ dateKey: state.dateKey, pin });
    setMessage("家长中心已解锁。");
  };
  const approveLearning = (reviewId: string) => {
    const next = approveTaskReview(state, reviewId, requiredTaskIds, parentPin);
    if (!next) setMessage("审核失败，请重新验证家长口令。");
    else {
      const earned = next.points - state.points;
      setState(next);
      setMessage(`已批准学习打卡，发放${earned}积分。`);
      if (!state.bonusAwarded && next.bonusAwarded) onVictory();
    }
  };
  const approveAllLearning = () => {
    const next = approveAllTaskReviews(state, requiredTaskIds, parentPin);
    if (!next) setMessage("批量审核失败，请重新验证家长口令。");
    else {
      const count = state.pendingTaskReviews.length;
      const earned = next.points - state.points;
      setState(next);
      setMessage(`已批准${count}项学习打卡，共发放${earned}积分。`);
      if (!state.bonusAwarded && next.bonusAwarded) onVictory();
    }
  };
  const rejectLearning = (reviewId: string) => {
    const next = rejectTaskReview(state, reviewId, parentPin);
    if (!next) setMessage("退回失败，请重新验证家长口令。");
    else { setState(next); setMessage("已退回任务，孩子可以重新完成后再提交。 "); }
  };
  const applyAdjustment = () => {
    const next = adjustPoints(state, Number(adjustment), parentPin);
    if (!next) setMessage("请输入正确口令和非零整数积分。");
    else { setState(next); setAdjustment(""); setMessage("积分调整完成。 "); }
  };
  const lockParent = () => {
    setParentSession(null);
    setPin("");
  };

  return (
    <section className="shop-page">
      <div className="shop-heading">
        <div className="section-title"><ShoppingBag size={42} /><div><p className="eyebrow">每周集中兑换 · 实物奖励由家长兑现</p><h2>积分兑换商店</h2></div></div>
      </div>

      <div className="shop-wallet">
        <div><span>我的积分</span><strong><Star size={22} />{state.points}</strong></div>
        <div className="wallet-goal"><div><span>距离“{nextReward.name}”</span><b>{state.points >= nextReward.costStars ? "已经达到" : `还差${nextReward.costStars - state.points}积分`}</b></div><div className="progress-track"><span style={{ width: `${rewardProgress}%` }} /></div></div>
        <div className={weekend ? "shop-open" : "shop-closed"}>{weekend ? "周末兑换开放中" : "周六、周日开放兑换"}</div>
      </div>

      <div className="shop-tabs" role="tablist" aria-label="积分商店页面">
        <button className={shopTab === "rewards" ? "active" : ""} role="tab" aria-selected={shopTab === "rewards"} onClick={() => setShopTab("rewards")}>奖励货架</button>
        <button className={shopTab === "records" ? "active" : ""} role="tab" aria-selected={shopTab === "records"} onClick={() => setShopTab("records")}>兑换记录</button>
        <button className={shopTab === "parent" ? "active" : ""} role="tab" aria-selected={shopTab === "parent"} onClick={() => setShopTab("parent")}>家长中心</button>
      </div>

      {message ? <p className="shop-message">{message}</p> : null}

      {shopTab === "rewards" ? (
        <div className="reward-grid">
          {rewards.map((reward) => {
            const activeRequest = state.rewardRequests.some((request) => request.rewardId === reward.id && request.status !== "fulfilled");
            const character = reward.id === "reward-snack" ? "my-melody" : reward.id === "reward-cartoon-30" ? "cinnamoroll" : "hello-kitty";
            return (
              <article className="reward-card" key={reward.id}>
                <div className="reward-visual"><img src={characterImages[character]} alt="" /><span>{reward.emoji}</span></div>
                <div className="reward-copy"><div><h3>{reward.name}</h3><strong>{reward.costStars}积分</strong></div><p>{reward.description}</p><p className="reward-distance">{activeRequest ? "申请已提交，等待家长处理。" : state.points >= reward.costStars ? "积分够啦，周末可以申请。" : `再完成一些任务，还差${reward.costStars - state.points}积分。`}</p></div>
                <button className="primary reward-action" disabled={state.points < reward.costStars || !weekend || activeRequest} onClick={() => applyReward(reward)}><Gift size={18} />{activeRequest ? "等待家长处理" : weekend ? "申请兑换" : "周末开放"}</button>
              </article>
            );
          })}
        </div>
      ) : null}

      {shopTab === "records" ? (
        <div className="records-layout">
          <section className="record-section monthly-calendar-section">
            <div className="calendar-heading"><div><p className="eyebrow">每日获得积分</p><h3>{calendarYear}年{calendarMonthNumber}月打卡记录</h3></div><div className="calendar-controls"><button aria-label="上一个月" title="上一个月" onClick={() => moveCalendar(-1)}><ChevronLeft size={20} /></button><button aria-label="下一个月" title="下一个月" onClick={() => moveCalendar(1)}><ChevronRight size={20} /></button></div></div>
            <div className="month-calendar"><div className="calendar-weekdays">{["一", "二", "三", "四", "五", "六", "日"].map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="calendar-days">{calendarDays.map((item, index) => item ? (() => { const points = state.dailyEarnedPoints[item.dateKey] ?? 0; const future = item.dateKey > state.dateKey; const completed = state.completedDates.includes(item.dateKey); return <div className={`calendar-day${completed ? " checked" : ""}${item.dateKey === state.dateKey ? " today" : ""}`} aria-label={`${item.dateKey}，${future ? "尚未到达" : `获得${points}积分`}${completed ? "，已完成全套任务" : ""}`} key={item.dateKey}><strong>{item.day}</strong>{completed ? <CheckCircle2 className="calendar-check" size={14} /> : null}<span>{future ? "" : `${points}分`}</span></div>; })() : <div className="calendar-day empty" aria-hidden="true" key={`empty-${index}`} />)}</div></div>
            <p className="calendar-note">只统计任务获得的积分；兑换扣分和家长手动调分不会改变这里的记录。</p>
          </section>
          <section className="record-section"><h3>兑换记录</h3><div className="request-list">{state.rewardRequests.length ? state.rewardRequests.map((request) => <div className="request-row" key={request.id}><div><strong>{request.rewardName}</strong><p>{formatDate(request.requestedAt.slice(0, 10))} · {request.cost}积分</p></div><span className={`status-chip ${request.status}`}>{request.status === "pending" ? "待家长批准" : request.status === "approved" ? "待兑现" : "已兑现"}</span></div>) : <div className="empty-record"><img src={characterImages["my-melody"]} alt="" /><p>还没有兑换记录，先完成今天的小目标吧。</p></div>}</div></section>
          <section className="record-section"><h3><Trophy size={20} /> 坚持勋章</h3><div className="badge-row">{[7, 14, 30].map((days) => <span className={badges.includes(days) ? "badge unlocked" : "badge"} key={days}>{days}天</span>)}</div><p>{badges.length ? `已解锁${badges.join("天、")}天坚持勋章。` : `还差${Math.max(0, 7 - streak)}天解锁第一枚勋章。`}</p></section>
        </div>
      ) : null}

      {shopTab === "parent" ? (
        <div className="parent-center">
          {!parentUnlocked ? <section className="parent-gate"><LockKeyhole size={30} /><div><h3>家长验证</h3><p>请输入今日四位家长口令，验证后即可审核学习、处理兑换和调整积分。</p><div className="parent-unlock-row"><input className="pin-input" aria-label="家长口令" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="今日四位口令" /><button className="primary" disabled={pin.length !== 4} onClick={unlockParent}>进入家长中心</button></div></div></section> : <>
            <section className="parent-section learning-review-section">
              <div className="parent-section-head"><div><p className="eyebrow">批准后才会发放对应积分</p><h3>今日学习审核 · {state.pendingTaskReviews.length}项待审</h3></div><div className="inline-actions"><button className="primary" disabled={!state.pendingTaskReviews.length} onClick={approveAllLearning}>一键批准全部</button><button className="secondary" onClick={lockParent}>退出家长中心</button></div></div>
              <div className="learning-review-list">{state.pendingTaskReviews.length ? state.pendingTaskReviews.map((review) => <div className="learning-review-row" key={review.id}><div><strong>{review.taskTitle}</strong><p>{formatTaskReviewEvidence(review)} · 提交于{new Date(review.submittedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p><span>批准后 +{review.points}积分</span></div><div className="review-actions"><button className="secondary" onClick={() => rejectLearning(review.id)}>退回重做</button><button className="primary" onClick={() => approveLearning(review.id)}>批准 +{review.points}</button></div></div>) : <div className="empty-record"><img src={characterImages.cinnamoroll} alt="" /><p>今天没有待审核任务。自动判分题达标后会直接发积分。</p></div>}</div>
            </section>
            <section className="parent-section"><h3>兑换审批</h3><div className="request-list">{state.rewardRequests.filter((request) => request.status !== "fulfilled").length ? state.rewardRequests.filter((request) => request.status !== "fulfilled").map((request) => <div className="request-row" key={request.id}><span><strong>{request.rewardName}</strong> · {request.cost}积分 · {request.status === "pending" ? "待批准" : "待兑现"}</span>{request.status === "pending" ? <button className="primary" onClick={() => approve(request.id)}>批准兑换</button> : <button className="secondary" onClick={() => fulfill(request.id)}>确认已兑现</button>}</div>) : <p className="muted">暂无待处理申请。</p>}</div></section>
            <div className="parent-dashboard">
              <section className="parent-section learning-report"><div className="report-heading"><h3><BarChart3 size={20} /> 学习报告总结</h3><div className="report-switch" role="tablist" aria-label="学习报告周期"><button className={reportPeriod === "day" ? "active" : ""} role="tab" aria-selected={reportPeriod === "day"} onClick={() => setReportPeriod("day")}>本日</button><button className={reportPeriod === "week" ? "active" : ""} role="tab" aria-selected={reportPeriod === "week"} onClick={() => setReportPeriod("week")}>本周</button><button className={reportPeriod === "month" ? "active" : ""} role="tab" aria-selected={reportPeriod === "month"} onClick={() => setReportPeriod("month")}>本月</button></div></div><div className="report-metrics"><div><span>完成任务</span><strong>{report.taskCount}项</strong></div><div><span>完整打卡</span><strong>{report.completedDays}天</strong></div><div><span>有效时长</span><strong>{Math.round(report.totalDurationSeconds / 60)}分钟</strong></div><div><span>口算正确率</span><strong>{report.arithmeticAverage ? `${report.arithmeticAverage}%` : "暂无"}</strong></div><div><span>获得积分</span><strong>{report.earnedPoints}</strong></div></div><p className="report-summary">{getLearningReportSummary(reportPeriod, report)}</p><p className="report-wrong">主要错题：{report.wrongQuestions.length ? report.wrongQuestions.slice(0, 5).join("、") : "暂无记录"}</p></section>
              <section className="parent-section"><h3>调整积分</h3><p>用于家长补发奖励或修正记录，负数会扣减但不会低于0。</p><input value={adjustment} onChange={(event) => setAdjustment(event.target.value.replace(/[^\d-]/g, ""))} placeholder="例如 10 或 -5" /><button className="secondary" onClick={applyAdjustment}>确认调整</button></section>
            </div>
          </>}
        </div>
      ) : null}
    </section>
  );
}

function formatTaskReviewEvidence(review: PendingTaskReview) {
  const evidence = [review.result.evidence];
  if (review.result.score !== undefined) evidence.push(`正确率${review.result.score}%`);
  if (review.result.durationSeconds && !review.result.evidence?.includes("计时")) evidence.push(`有效用时${Math.max(1, Math.round(review.result.durationSeconds / 60))}分钟`);
  return evidence.filter(Boolean).join(" · ") || "已完成任务要求";
}

function getMonthCalendar(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) return null;
    return { day, dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
  });
}

function getLearningReportSummary(period: "day" | "week" | "month", report: ReturnType<typeof getDailyReport>) {
  if (!report.taskCount) return period === "day" ? "今天还没有已完成的任务，先从一个小目标开始。" : `${period === "week" ? "本周" : "本月"}还没有学习记录，完成任务后这里会自动总结。`;
  if (report.arithmeticAverage >= 90) return `${period === "day" ? "今天" : period === "week" ? "本周" : "本月"}学习节奏很稳，口算准确率也很出色，继续保持检查习惯。`;
  if (report.wrongQuestions.length) return `已经完成${report.taskCount}项任务，下一步优先重练记录中的错题，进步会更扎实。`;
  return `已经完成${report.taskCount}项任务，累计学习${Math.round(report.totalDurationSeconds / 60)}分钟，每一次认真完成都值得记录。`;
}
