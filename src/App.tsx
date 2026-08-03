import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Apple,
  BarChart3,
  Bell,
  Bird,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Clock3,
  Gift,
  Heart,
  LockKeyhole,
  LogOut,
  Mail,
  Play,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  SprayCan,
  Smartphone,
  Star,
  Trophy,
  Utensils,
  Droplets,
} from "lucide-react";
import {
  characterImages,
  curriculumNote,
  getDailyTaskIds,
  getNightReading,
  getGameChallenges,
  getStudySchedule,
  getWeeklyContent,
  optionalTaskIds,
  sectionMeta,
  taskCatalog,
  type GameChallenge,
  type TaskCategory,
  type TaskDefinition,
  type ViewKey,
  wordProblemAnswerMatches,
  wordProblems,
} from "./appData";
import { chineseReadings, readingComprehensions, shopRewards } from "./data";
import { areAllArithmeticAnswersFilled, arithmeticScore, findWrongArithmeticIndices, matchKeywordGroups } from "./learningRules";
import type { ReadingQuestion } from "./types/learning";
import {
  adjustPoints,
  advanceContentRound,
  approveAllTaskReviews,
  approveReward,
  approveTaskReview,
  cancelReward,
  calculateStreak,
  completeTask,
  dailyParentPin,
  dateKey,
  fulfillReward,
  getDailyReport,
  getMonthlyReport,
  getWeeklyReport,
  isDailyReadyForNotification,
  isWeekend,
  markDailyReadyNotified,
  interactWithPet,
  petItemDefinitions,
  purchasePetItem,
  readStoredState,
  rejectTaskReview,
  rejectReward,
  requestReward,
  STORAGE_KEY,
  submitTaskReview,
  unlockedBadges,
  verifyParentPin,
  type CompletionResultInput,
  type PendingTaskReview,
  type PetAction,
  type PetItemId,
  type PetLastAction,
  type TaskResult,
  type PetState,
  type WorkspaceState,
} from "./state/workspace";
import { sendDailyReadyNotification } from "./services/dailyNotification";
import { useCloudWorkspace } from "./cloud/useCloudWorkspace";
import type { CloudWorkspaceController } from "./cloud/types";

type Route = { view: ViewKey; taskId?: string };

type PetSoundAction = Extract<PetLastAction, "feed" | "play" | "bathe" | "purchase">;

let petAudioContext: AudioContext | null = null;

function preparePetSound() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  if (!petAudioContext) petAudioContext = new window.AudioContext();
  if (petAudioContext.state === "suspended") void petAudioContext.resume();
}

function playPetSound(action: PetSoundAction) {
  preparePetSound();
  const context = petAudioContext;
  if (!context) return;

  const patterns: Record<PetSoundAction, Array<[number, number, number]>> = {
    feed: [[880, 0, 0.12], [1175, 0.1, 0.16]],
    play: [[659, 0, 0.14], [988, 0.1, 0.14], [1318, 0.2, 0.22]],
    bathe: [[1175, 0, 0.1], [1568, 0.13, 0.14], [1047, 0.27, 0.2]],
    purchase: [[784, 0, 0.12], [1175, 0.1, 0.18]],
  };
  const type: OscillatorType = action === "play" ? "triangle" : "sine";
  const volume = action === "bathe" ? 0.08 : 0.12;
  const start = context.currentTime;

  patterns[action].forEach(([frequency, offset, duration]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start + offset);
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(volume, start + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration + 0.02);
  });
}

export interface ArithmeticQuestion {
  prompt: string;
  answer: number;
}

interface TaskOutcome extends CompletionResultInput {
  ready: boolean;
  message?: string;
}

const emptyOutcome: TaskOutcome = { ready: false, durationSeconds: 0, attempts: 1, wrongQuestions: [] };
const sectionKeys: ViewKey[] = ["home", "chinese", "math", "english", "game", "sport", "shop", "pet"];
const encouragements = [
  "认真完成一小步，今天就更稳一点。",
  "慢慢读、认真写，好习惯会留下来。",
  "闯关要专注，答完再检查一遍。",
  "轻轻松松坚持，积分会一点点变多。",
];

const dateFromKey = (value: string) => new Date(`${value}T12:00:00`);

const CONTENT_DATE_STORAGE_KEY = "my-work-buddy-content-date-v1";

const addDays = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
};

const readContentDateKey = (actualDateKey: string) => {
  try {
    const saved = window.localStorage.getItem(CONTENT_DATE_STORAGE_KEY);
    return saved && saved >= actualDateKey ? saved : actualDateKey;
  } catch {
    return actualDateKey;
  }
};

const PRACTICE_DRAFT_PREFIX = "my-work-buddy-practice-draft-v1:";

const readPracticeDraft = <T,>(key: string): T | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const saved = window.localStorage.getItem(`${PRACTICE_DRAFT_PREFIX}${key}`);
    return saved ? JSON.parse(saved) as T : undefined;
  } catch {
    return undefined;
  }
};

function usePracticeDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readPracticeDraft<T>(key) ?? initial);
  const keyRef = useRef(key);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;
    setValue(readPracticeDraft<T>(key) ?? initialRef.current);
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`${PRACTICE_DRAFT_PREFIX}${key}`, JSON.stringify(value));
    } catch {
      // Local storage may be unavailable in private browsing; the exercise still works in memory.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

const completedTaskIdsForToday = (state: WorkspaceState) => Array.from(new Set([
  ...state.completedTaskIds,
  ...state.taskResults.filter((result) => result.dateKey === state.dateKey && (result.contentRound ?? 0) === state.contentRound).map((result) => result.taskId),
]));

const formatDate = (value: string) => value.slice(5).replace("-", "/");

export const generateArithmetic = (seedText: string, count = 20, excludedPrompts: string[] = []): ArithmeticQuestion[] => {
  let seed = [...seedText].reduce((sum, char) => sum + char.charCodeAt(0), 37);
  const excluded = new Set(excludedPrompts);
  const questions: ArithmeticQuestion[] = [];
  const seen = new Set<string>();
  const next = () => {
    seed = Math.floor((seed * 1103515245 + 12345) % 2147483647);
    return seed;
  };

  for (let index = 0; questions.length < count && index < count * 80; index += 1) {
    const isAdd = index % 3 !== 1;
    if (isAdd) {
      const a = 1 + (next() % 99);
      const b = 1 + (next() % (100 - a));
      const question = { prompt: `${a} + ${b} =`, answer: a + b };
      if (!excluded.has(question.prompt) && !seen.has(question.prompt)) { seen.add(question.prompt); questions.push(question); }
      continue;
    }
    const a = 2 + (next() % 99);
    const b = 1 + (next() % (a - 1));
    const question = { prompt: `${a} - ${b} =`, answer: a - b };
    if (!excluded.has(question.prompt) && !seen.has(question.prompt)) { seen.add(question.prompt); questions.push(question); }
  }
  return questions;
};

export default function App() {
  const workspace = useCloudWorkspace();
  const state = workspace.state;
  const setState = workspace.setLocalState;
  const [route, setRoute] = useState<Route>({ view: "home" });
  const [toast, setToast] = useState("");
  const [showVictory, setShowVictory] = useState(false);
  const [parentSession, setParentSession] = useState<{ dateKey: string; pin: string } | null>(null);
  const [contentDateKey, setContentDateKey] = useState(() => readContentDateKey(dateKey()));
  const notificationAttemptedDate = useRef<string | null>(null);
  const previousCloudBonus = useRef<boolean | null>(null);

  useEffect(() => {
    if (workspace.enabled && workspace.mode !== "ready") return;
    const refreshToday = () => {
      workspace.refreshLocalDate();
      if (workspace.enabled) void workspace.refresh();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshToday();
    };
    refreshToday();
    const id = window.setInterval(refreshToday, 60_000);
    window.addEventListener("focus", refreshToday);
    window.addEventListener("pageshow", refreshToday);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", refreshToday);
      window.removeEventListener("pageshow", refreshToday);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [workspace.enabled, workspace.mode, workspace.refresh, workspace.refreshLocalDate]);

  useEffect(() => {
    setParentSession((current) => current?.dateKey === state.dateKey ? current : null);
  }, [state.dateKey]);

  useEffect(() => {
    if (contentDateKey < state.dateKey) {
      setContentDateKey(state.dateKey);
      return;
    }
    try {
      window.localStorage.setItem(CONTENT_DATE_STORAGE_KEY, contentDateKey);
    } catch {
      // Content preview still works in memory when local storage is unavailable.
    }
  }, [contentDateKey, state.dateKey]);

  useEffect(() => {
    if (state.contentDateKey && state.contentDateKey > contentDateKey) setContentDateKey(state.contentDateKey);
  }, [state.contentDateKey]);

  useEffect(() => {
    if (!workspace.enabled || workspace.mode !== "ready") {
      previousCloudBonus.current = null;
      return;
    }
    if (previousCloudBonus.current === null) {
      previousCloudBonus.current = state.bonusAwarded;
      return;
    }
    if (!previousCloudBonus.current && state.bonusAwarded) setShowVictory(true);
    previousCloudBonus.current = state.bonusAwarded;
  }, [state.bonusAwarded, workspace.enabled, workspace.mode]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route.view, route.taskId]);

  const currentDate = dateFromKey(state.dateKey);
  const previousDateKey = dateKey(new Date(currentDate.getTime() - 86_400_000));
  const requiredTaskIds = getDailyTaskIds(currentDate, { previousDayCompleted: state.completedDates.includes(previousDateKey) });
  const completedTaskIds = completedTaskIdsForToday(state);
  const readyTaskIds = new Set([...completedTaskIds, ...state.pendingTaskReviews.filter((review) => review.dateKey === state.dateKey).map((review) => review.taskId), ...workspace.pendingTaskIds]);
  const completedRequired = requiredTaskIds.filter((id) => readyTaskIds.has(id)).length;
  const progress = Math.round((completedRequired / requiredTaskIds.length) * 100);
  const streak = calculateStreak(state.completedDates, currentDate, state.dailyEarnedPoints);
  const currentTask = route.taskId ? taskCatalog.find((task) => task.id === route.taskId) : undefined;
  const existingTaskResult = currentTask ? state.taskResults.find((result) => result.taskId === currentTask.id && result.dateKey === state.dateKey && (result.contentRound ?? 0) === state.contentRound) : undefined;
  const dailyReadyForNotification = isDailyReadyForNotification(state, requiredTaskIds);
  const dailyReadyNotificationSent = state.notifiedDailyReadyDates.includes(state.dateKey);
  const advanceContent = () => {
    if (!window.confirm("确定切换到下一组新题目吗？\n\n每次切换都会开启新学习轮次，完成后可再次获得积分。")) return;
    const nextContentDateKey = dateKey(addDays(dateFromKey(contentDateKey), 1));
    setContentDateKey(nextContentDateKey);
    setState((current) => advanceContentRound(current, nextContentDateKey));
    if (workspace.enabled) void workspace.startContentRound(nextContentDateKey).catch(() => undefined);
    setToast("已开启新学习轮次，完成新题目后可再次获得积分。");
  };

  useEffect(() => {
    if (workspace.enabled || !dailyReadyForNotification || dailyReadyNotificationSent) return;

    let active = true;
    const notify = async () => {
      if (notificationAttemptedDate.current === state.dateKey) return;
      notificationAttemptedDate.current = state.dateKey;
      const result = await sendDailyReadyNotification(state.dateKey);
      if (!active) return;
      if (result === "sent") {
        setState((current) => markDailyReadyNotified(current, state.dateKey));
      } else {
        notificationAttemptedDate.current = null;
      }
    };
    const notifyWhenOnline = () => void notify();

    if (navigator.onLine) void notify();
    window.addEventListener("online", notifyWhenOnline);
    return () => {
      active = false;
      window.removeEventListener("online", notifyWhenOnline);
    };
  }, [dailyReadyForNotification, dailyReadyNotificationSent, state.dateKey, workspace.enabled]);

  const markTaskDone = (task: TaskDefinition, outcome: TaskOutcome) => {
    const enrichedOutcome = { ...outcome, contentRound: state.contentRound, contentDateKey };
    if (workspace.enabled) {
      void workspace.submitTask(task, enrichedOutcome).then((result) => {
        setToast(result === "queued" ? `${task.shortTitle}已保存在本机，联网后会自动同步。` : task.completionMode === "parent" ? `${task.shortTitle}已提交，等待家长审核。` : `${task.shortTitle}完成，积分已同步。`);
      }).catch((submitError: unknown) => setToast(submitError instanceof Error ? submitError.message : "任务未能同步，请稍后再试。"));
      return;
    }
    if (task.completionMode === "parent") {
      const nextState = submitTaskReview(state, task, enrichedOutcome);
      setState(nextState);
      setToast(`${task.shortTitle}已提交，等待家长今天统一审核。`);
      return;
    }
    const beforeBonus = state.bonusAwarded;
    const nextState = completeTask(state, task.id, task.points, requiredTaskIds, enrichedOutcome);
    setState(nextState);
    setToast(`${task.shortTitle}完成，获得${task.points}积分。${encouragements[state.taskResults.length % encouragements.length]}`);
    if (!beforeBonus && nextState.bonusAwarded) setShowVictory(true);
  };

  const navigate = (view: ViewKey) => {
    setRoute({ view });
  };
  const openTask = (taskId: string) => setRoute({ view: taskCatalog.find((task) => task.id === taskId)?.category ?? "home", taskId });
  const returnToSection = () => {
    if (!currentTask) return;
    navigate(currentTask.category);
  };

  if (workspace.enabled && workspace.mode !== "ready") return <CloudAccessGate workspace={workspace} />;

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
              <img className={`nav-icon-image${key === "english" ? " nav-icon-english" : ""}${key === "pet" ? " nav-icon-pet" : ""}`} src={sectionMeta[key].navIcon} alt="" />
              <span className="nav-label">{sectionMeta[key].label}</span>
              <span className="nav-mobile-label">{sectionMeta[key].mobileLabel}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <TopBar points={state.points} progress={progress} completedCount={completedRequired} requiredCount={requiredTaskIds.length} streak={streak} backLabel={currentTask ? `返回${sectionMeta[currentTask.category].label}` : undefined} onBack={currentTask ? returnToSection : undefined} cloud={workspace} contentRound={state.contentRound} onAdvanceContent={advanceContent} />
        {toast ? <div className="toast" onAnimationEnd={() => setToast("")}>{toast}</div> : null}

        {currentTask ? (
          <TaskPage task={currentTask} completed={completedTaskIds.includes(currentTask.id)} existingResult={existingTaskResult} pending={state.pendingTaskReviews.some((review) => review.taskId === currentTask.id && (review.contentRound ?? 0) === state.contentRound)} syncPending={workspace.pendingTaskIds.includes(currentTask.id)} eligible dateKey={state.dateKey} contentDateKey={contentDateKey} contentRound={state.contentRound} masteredQuestionKeys={state.masteredQuestionKeys} onDone={(outcome) => markTaskDone(currentTask, outcome)} />
        ) : route.view === "home" ? (
          <HomePage state={state} contentDateKey={contentDateKey} requiredTaskIds={requiredTaskIds} syncPendingIds={workspace.pendingTaskIds} onOpenTask={openTask} />
        ) : route.view === "shop" ? (
          <ShopPage state={state} setState={setState} streak={streak} requiredTaskIds={requiredTaskIds} parentSession={parentSession} setParentSession={setParentSession} onVictory={() => setShowVictory(true)} cloud={workspace} />
        ) : route.view === "pet" ? (
          <PetPage state={state} setState={setState} cloud={workspace} onToast={setToast} />
        ) : (
          <SectionPage view={route.view} completedIds={completedTaskIds} pendingIds={state.pendingTaskReviews.map((review) => review.taskId)} syncPendingIds={workspace.pendingTaskIds} requiredTaskIds={requiredTaskIds} dateKey={state.dateKey} contentDateKey={contentDateKey} onOpenTask={openTask} />
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

function CloudAccessGate({ workspace }: { workspace: CloudWorkspaceController }) {
  const [accessType, setAccessType] = useState<"parent-code" | "parent-email" | "child">(workspace.mode === "pairing" ? "child" : "parent-code");
  const [email, setEmail] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [parentCode, setParentCode] = useState("");
  const [deviceName, setDeviceName] = useState("孩子的设备");
  const [parentDeviceName, setParentDeviceName] = useState("家长电脑");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(workspace.mode === "pairing");

  useEffect(() => {
    if (workspace.mode === "pairing") setAccessType("child");
  }, [workspace.mode]);

  const submitParent = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await workspace.loginParent(email.trim());
    } catch (loginError) {
      setMessage(loginError instanceof Error ? loginError.message : "登录邮件发送失败。");
    } finally {
      setBusy(false);
    }
  };

  const submitParentCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await workspace.pairParent(parentCode, parentDeviceName.trim());
    } catch (pairError) {
      setMessage(pairError instanceof Error ? pairError.message : "家长配对码无效或已过期。");
    } finally {
      setBusy(false);
    }
  };

  const submitAutoLogin = async () => {
    setBusy(true);
    setMessage("");
    try {
      await workspace.refresh();
    } catch (refreshError) {
      setMessage(refreshError instanceof Error ? refreshError.message : "未找到已保存的家长登录，请完成首次验证。");
    } finally {
      setBusy(false);
    }
  };

  const submitChild = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await workspace.pairChild(pairCode, deviceName.trim());
    } catch (pairError) {
      setMessage(pairError instanceof Error ? pairError.message : "设备配对失败，请检查配对码。");
    } finally {
      setBusy(false);
    }
  };

  const confirmMigration = async () => {
    setBusy(true);
    setMessage("");
    try {
      await workspace.confirmLegacyImport();
    } catch (migrationError) {
      setMessage(migrationError instanceof Error ? migrationError.message : "迁移未完成，请稍后重试。");
    } finally {
      setBusy(false);
    }
  };

  if (workspace.mode === "loading") {
    return <main className="cloud-access-screen"><div className="cloud-access-panel loading"><img src={characterImages.cinnamoroll} alt="" /><RefreshCw className="spin" size={28} /><h1>正在打开甜心工作台</h1></div></main>;
  }

  if (workspace.mode === "migration" && workspace.legacyPreview) {
    const preview = workspace.legacyPreview;
    return (
      <main className="cloud-access-screen">
        <section className="cloud-access-panel migration-confirm">
          <div className="cloud-access-brand"><img src={characterImages["hello-kitty"]} alt="" /><div><p className="eyebrow">首次云端建档</p><h1>确认主迁移设备</h1></div></div>
          <p>请只在记录最完整的旧设备上确认。确认后，这台设备的数据会成为家庭云端起点。</p>
          <div className="migration-summary" aria-label="本机待迁移数据摘要">
            <div><span>当前积分</span><strong>{preview.points}</strong></div>
            <div><span>完整打卡</span><strong>{preview.completedDays}天</strong></div>
            <div><span>学习记录</span><strong>{preview.taskResults}条</strong></div>
            <div><span>待审核</span><strong>{preview.pendingReviews}条</strong></div>
            <div><span>兑换记录</span><strong>{preview.rewardRequests}条</strong></div>
            <div><span>本机日期</span><strong>{preview.latestDate}</strong></div>
          </div>
          <div className="cloud-access-actions migration-actions">
            <button className="primary" disabled={busy} onClick={() => void confirmMigration()}>{busy ? <RefreshCw className="spin" size={18} /> : <CheckCircle2 size={18} />}确认从此设备迁移</button>
            <button className="secondary" disabled={busy} onClick={() => void workspace.signOut()}><LogOut size={18} />退出，换用记录完整的设备</button>
          </div>
          {workspace.error || message ? <p className="cloud-access-message">{workspace.error || message}</p> : null}
        </section>
      </main>
    );
  }

  if (!showFirstTimeSetup && workspace.mode !== "pairing") {
    return (
      <main className="cloud-access-screen">
        <section className="cloud-access-panel">
          <div className="cloud-access-brand"><img src={characterImages["hello-kitty"]} alt="" /><div><p className="eyebrow">Cloud sync</p><h1>甜心工作台</h1></div></div>
          <div className="cloud-access-form">
            <p className="cloud-access-hint">家长设备已安全登录。下次打开时点击一键恢复，数据会自动同步。</p>
            <button className="primary big" disabled={busy} onClick={() => void submitAutoLogin()}>{busy ? <RefreshCw className="spin" size={20} /> : <LockKeyhole size={20} />}一键恢复家长登录</button>
            <button className="secondary" disabled={busy} onClick={() => setShowFirstTimeSetup(true)}><RefreshCw size={17} />首次设置家长设备</button>
          </div>
          {workspace.authMessage || message || workspace.error ? <p className="cloud-access-message">{workspace.authMessage || message || workspace.error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="cloud-access-screen">
      <section className="cloud-access-panel">
        <div className="cloud-access-brand"><img src={characterImages["hello-kitty"]} alt="" /><div><p className="eyebrow">云端多设备同步</p><h1>甜心工作台</h1></div></div>
        <div className="access-switch" role="tablist" aria-label="选择进入方式">
          <button className={accessType === "parent-code" ? "active" : ""} role="tab" aria-selected={accessType === "parent-code"} onClick={() => setAccessType("parent-code")}><LockKeyhole size={18} />家长快速登录</button>
          <button className={accessType === "child" ? "active" : ""} role="tab" aria-selected={accessType === "child"} onClick={() => setAccessType("child")}><Smartphone size={18} />孩子设备</button>
        </div>

        {accessType === "parent-code" ? (
          <form className="cloud-access-form" onSubmit={submitParentCode}>
            <p className="cloud-access-hint">请在已登录的家长设备中生成家长配对码，输入一次后本设备会保持登录。</p>
            <label>家长配对码<input inputMode="numeric" maxLength={6} required value={parentCode} onChange={(event) => setParentCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>
            <label>设备名称<input maxLength={20} required value={parentDeviceName} onChange={(event) => setParentDeviceName(event.target.value)} /></label>
            <button className="primary" disabled={busy || parentCode.length !== 6}>{busy ? <RefreshCw className="spin" size={18} /> : <LockKeyhole size={18} />}使用家长配对码登录</button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setAccessType("parent-email")}><Mail size={17} />改用邮箱登录</button>
          </form>
        ) : accessType === "parent-email" ? (
          <form className="cloud-access-form" onSubmit={submitParent}>
            <label>家长邮箱<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
            <button className="primary" disabled={busy || !email.trim()}>{busy ? <RefreshCw className="spin" size={18} /> : <Mail size={18} />}发送登录链接</button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setAccessType("parent-code")}><LockKeyhole size={17} />返回家长快速登录</button>
          </form>
        ) : (
          <form className="cloud-access-form" onSubmit={submitChild}>
            <label>六位配对码<input inputMode="numeric" maxLength={6} required value={pairCode} onChange={(event) => setPairCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>
            <label>设备名称<input maxLength={20} required value={deviceName} onChange={(event) => setDeviceName(event.target.value)} /></label>
            <button className="primary" disabled={busy || pairCode.length !== 6}>{busy ? <RefreshCw className="spin" size={18} /> : <Smartphone size={18} />}连接家庭工作台</button>
          </form>
        )}

        {workspace.authMessage || message || workspace.error ? <p className="cloud-access-message">{workspace.authMessage || message || workspace.error}</p> : null}
        {workspace.mode !== "pairing" ? <div className="cloud-access-actions"><button className="secondary" disabled={busy} onClick={() => setShowFirstTimeSetup(false)}><ArrowLeft size={17} />返回一键登录</button></div> : null}
        {workspace.mode === "signed-out" && workspace.authMessage ? <div className="cloud-access-actions"><button className="secondary" onClick={() => void workspace.refresh()}><RefreshCw size={17} />我已打开邮件，检查登录状态</button></div> : null}
        {workspace.mode === "error" || workspace.mode === "pairing" ? <div className="cloud-access-actions"><button className="secondary" onClick={() => void workspace.refresh()}><RefreshCw size={17} />重新连接</button><button className="secondary" onClick={() => void workspace.signOut()}><LogOut size={17} />清除当前会话</button></div> : null}
      </section>
    </main>
  );
}

function TopBar({ points, progress, completedCount, requiredCount, streak, backLabel, onBack, cloud, contentRound, onAdvanceContent }: { points: number; progress: number; completedCount: number; requiredCount: number; streak: number; backLabel?: string; onBack?: () => void; cloud: CloudWorkspaceController; contentRound: number; onAdvanceContent: () => void }) {
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
        <button className="content-refresh-button" type="button" title="切换新题并获得新一轮积分" aria-label="切换新题并获得新一轮积分" onClick={onAdvanceContent}><RefreshCw size={17} />更新新题 · {contentRound + 1}</button>
        {cloud.enabled ? <span className={`cloud-status ${cloud.syncStatus}`}>{cloud.syncStatus === "offline" ? <CloudOff size={17} /> : cloud.syncStatus === "syncing" ? <RefreshCw className="spin" size={17} /> : <Cloud size={17} />}{cloud.syncStatus === "synced" ? "已同步" : cloud.syncStatus === "syncing" ? "同步中" : cloud.syncStatus === "pending" ? "待同步" : "离线"}</span> : null}
      </div>
    </header>
  );
}

function HomePage({ state, contentDateKey, requiredTaskIds, syncPendingIds, onOpenTask }: { state: WorkspaceState; contentDateKey: string; requiredTaskIds: string[]; syncPendingIds: string[]; onOpenTask: (taskId: string) => void }) {
  const dailyTasks = requiredTaskIds.map((id) => taskCatalog.find((task) => task.id === id)).filter((task): task is TaskDefinition => Boolean(task));
  const optionalTasks = optionalTaskIds.map((id) => taskCatalog.find((task) => task.id === id)).filter((task): task is TaskDefinition => Boolean(task));
  const completedTaskIds = completedTaskIdsForToday(state);
  const readyTaskIds = new Set([...completedTaskIds, ...state.pendingTaskReviews.filter((review) => review.dateKey === state.dateKey).map((review) => review.taskId), ...syncPendingIds]);
  const report = getWeeklyReport(state);
  const weeklyTarget = 250;
  const weeklyProgress = Math.min(100, Math.round((report.earnedPoints / weeklyTarget) * 100));
  const weekContent = getWeeklyContent(dateFromKey(contentDateKey));
  const schedule = getStudySchedule(dateFromKey(contentDateKey));

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
      <TaskGrid tasks={dailyTasks} completedIds={completedTaskIds} pendingIds={state.pendingTaskReviews.map((review) => review.taskId)} syncPendingIds={syncPendingIds} requiredTaskIds={requiredTaskIds} onOpenTask={onOpenTask} />
      <div className="section-title compact-title">
        <Trophy size={34} />
        <div><h2>奖励小游戏</h2><p>所有小游戏均已开放，完成后可获得积分。</p></div>
      </div>
      <TaskGrid tasks={optionalTasks} completedIds={completedTaskIds} pendingIds={state.pendingTaskReviews.map((review) => review.taskId)} syncPendingIds={syncPendingIds} requiredTaskIds={requiredTaskIds} onOpenTask={onOpenTask} />
    </section>
  );
}

function SectionPage({ view, completedIds, pendingIds, syncPendingIds, requiredTaskIds, dateKey, contentDateKey, onOpenTask }: { view: TaskCategory; completedIds: string[]; pendingIds: string[]; syncPendingIds: string[]; requiredTaskIds: string[]; dateKey: string; contentDateKey: string; onOpenTask: (taskId: string) => void }) {
  const tasks = taskCatalog.filter((task) => task.category === view);
  const meta = sectionMeta[view];
  return (
    <section>
      <div className="section-title">
        <img src={characterImages[meta.character]} alt="" />
        <div><p className="eyebrow">{curriculumNote}</p><h2>{meta.label}</h2></div>
      </div>
      {view === "chinese" || view === "math" || view === "english" ? <SubjectDashboard view={view} dateKey={contentDateKey} tasks={tasks} completedIds={completedIds} /> : null}
      <TaskGrid tasks={tasks} completedIds={completedIds} pendingIds={pendingIds} syncPendingIds={syncPendingIds} requiredTaskIds={requiredTaskIds} onOpenTask={onOpenTask} />
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

function TaskGrid({ tasks, completedIds, pendingIds, syncPendingIds, requiredTaskIds, onOpenTask }: { tasks: TaskDefinition[]; completedIds: string[]; pendingIds: string[]; syncPendingIds: string[]; requiredTaskIds: string[]; onOpenTask: (taskId: string) => void }) {
  return (
    <div className="task-grid">
      {tasks.map((task) => {
        const completed = completedIds.includes(task.id);
        const pending = pendingIds.includes(task.id);
        const syncPending = syncPendingIds.includes(task.id);
        const required = requiredTaskIds.includes(task.id);
        return (
          <article className={completed ? "task-card completed" : pending || syncPending ? "task-card pending" : "task-card"} key={task.id} data-task-id={task.id}>
            <img src={characterImages[task.character]} alt="" />
            <div>
              <p className="task-meta">{syncPending ? "待同步" : pending ? "待家长审核" : required ? "今日必做" : task.schedule === "optional" ? "奖励任务" : "本周轮换"} · {task.minutes} · +{task.points}</p>
              <h3>{task.title}</h3>
              <p>{task.summary}</p>
            </div>
            <div className="card-actions">
              <button className="secondary" disabled={syncPending} onClick={() => onOpenTask(task.id)}>{pending || syncPending ? <Clock3 size={16} /> : <Play size={16} />}{syncPending ? "等待同步" : pending ? "查看提交" : completed ? "查看练习" : "开始挑战"}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TaskPage({ task, completed, existingResult, pending, syncPending, eligible, dateKey, contentDateKey, contentRound, masteredQuestionKeys, onDone }: { task: TaskDefinition; completed: boolean; existingResult?: TaskResult; pending: boolean; syncPending: boolean; eligible: boolean; dateKey: string; contentDateKey: string; contentRound: number; masteredQuestionKeys: string[]; onDone: (outcome: TaskOutcome) => void }) {
  const directCompletion = task.completionMode === "auto" && task.minimumScore === 0;
  const initialOutcome = completed || directCompletion ? { ...emptyOutcome, ready: true, evidence: directCompletion ? "孩子自主确认已完成任务" : undefined, message: directCompletion ? "完成后，可以直接点击完成任务。" : undefined } : emptyOutcome;
  const [outcome, setOutcome] = usePracticeDraft<TaskOutcome>(`task:${task.id}:${dateKey}:${contentRound}`, initialOutcome);

  const canComplete = outcome.ready && !completed && !pending && !syncPending && eligible;

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
      <TaskContent task={task} dateKey={contentDateKey} existingResult={existingResult} masteredQuestionKeys={masteredQuestionKeys} onProgress={setOutcome} />
      <div className="finish-bar">
        <p className={outcome.ready && eligible ? "answer" : "muted"}>{completed ? "今天已经获得过这项积分。" : syncPending ? "任务已保存在本机，联网后同步并结算正式积分。" : pending ? "已经提交到今日家长审核，批准后自动发放积分。" : !eligible ? "今天可以自由练习，这项不计入今日积分。" : outcome.message ?? completionHint(task)}</p>
        <button className="primary big" disabled={!canComplete} onClick={() => onDone({
          ...outcome,
          durationSeconds: outcome.durationSeconds ?? 0,
        })}>
          <CheckCircle2 size={20} />{completed ? "今天已完成" : syncPending ? "等待同步" : pending ? "等待家长审核" : !eligible ? "今日自由练习" : task.completionMode === "parent" ? "提交家长审核" : `完成任务 +${task.points}`}
        </button>
      </div>
    </section>
  );
}

function completionHint(task: TaskDefinition) {
  if (task.completionMode === "timer") return `有效练习达到${Math.round((task.minimumDuration ?? 0) / 60)}分钟后自动完成并发放积分。`;
  if (task.completionMode === "parent") return "先完成练习要求，再提交到今日家长审核。";
  return `正确率达到${task.minimumScore ?? 80}%后解锁积分。`;
}

function TaskContent({ task, dateKey, existingResult, masteredQuestionKeys, onProgress }: { task: TaskDefinition; dateKey: string; existingResult?: TaskResult; masteredQuestionKeys: string[]; onProgress: (outcome: TaskOutcome) => void }) {
  switch (task.id) {
    case "chinese-morning-reading": return <MorningReading dateKey={dateKey} />;
    case "chinese-preview-copybook": return <CopybookPreview dateKey={dateKey} onProgress={onProgress} />;
    case "chinese-memorize": return <Memorize dateKey={dateKey} onProgress={onProgress} />;
    case "chinese-dictation": return <Dictation dateKey={dateKey} onProgress={onProgress} />;
    case "chinese-night-reading": return <NightReading dateKey={dateKey} />;
    case "chinese-picture-writing": return <PictureWriting dateKey={dateKey} onProgress={onProgress} />;
    case "chinese-reading-comprehension": return <ReadingComprehensionPanel dateKey={dateKey} onProgress={onProgress} />;
    case "math-arithmetic": return <Arithmetic dateKey={dateKey} existingResult={existingResult} masteredQuestionKeys={masteredQuestionKeys} onProgress={onProgress} />;
    case "math-multiply-divide": return <MultiplyDivide dateKey={dateKey} masteredQuestionKeys={masteredQuestionKeys} onProgress={onProgress} />;
    case "math-word-problems": return <WordProblems dateKey={dateKey} masteredQuestionKeys={masteredQuestionKeys} onProgress={onProgress} />;
    case "english-daily": return <EnglishDaily dateKey={dateKey} />;
    case "sport-rope":
    case "sport-high-jump":
    case "sport-hour": return <SportTask taskId={task.id} dateKey={dateKey} onProgress={onProgress} />;
    default: return <GameTask key={`${task.id}-${dateKey}`} taskId={task.id} dateKey={dateKey} masteredQuestionKeys={masteredQuestionKeys} onProgress={onProgress} />;
  }
}

let speechVoiceRequestId = 0;

const chineseFemaleVoiceNames = [
  "Xiaoxiao",
  "Xiaoyi",
  "Ting-Ting",
  "TingTing",
  "Mei-Jia",
  "Yaoyao",
  "Huihui",
  "Siri",
  "\u6653\u6653",
  "\u6653\u4f0a",
  "\u5a77\u5a77",
  "\u4e01\u4e01",
  "\u7f8e\u52a0",
];

const speechMaleVoicePattern = /yunxi|yunyang|yunjian|yunfeng|google.*\u666e\u901a\u8bdd|male|man|\u4e91\u5e0c|\u4e91\u626c|\u4e91\u5065|\u4e91\u67ab/i;

function selectSpeechVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const language = lang.slice(0, 2).toLowerCase();
  const languageVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(language));
  const candidates = languageVoices;
  const isChinese = lang.toLowerCase().startsWith("zh");
  const labelOf = (voice: SpeechSynthesisVoice) => `${voice.name} ${voice.voiceURI}`;
  const isFemale = (voice: SpeechSynthesisVoice) => {
    const label = labelOf(voice);
    return !speechMaleVoicePattern.test(label) && (isChinese
      ? chineseFemaleVoiceNames.some((name) => label.toLowerCase().includes(name.toLowerCase()))
        || /female|woman|\u5973\u58f0/i.test(label)
      : /female|woman|samantha|jenny|sonia|libby|serena|stephanie|aria|ava/i.test(label));
  };
  const preferred = isChinese
    ? chineseFemaleVoiceNames
    : ["Sonia", "Libby", "Serena", "Stephanie", "Jenny", "Samantha", "Aria", "Ava"];
  const selected = candidates.find(isFemale)
    ?? preferred
      .map((name) => candidates.find((voice) => labelOf(voice).toLowerCase().includes(name.toLowerCase())))
      .find((voice): voice is SpeechSynthesisVoice => {
        if (!voice) return false;
        return !speechMaleVoicePattern.test(labelOf(voice));
      })
    ?? candidates.find((voice) => !speechMaleVoicePattern.test(labelOf(voice)))
    ?? candidates[0];
  return { voice: selected ?? null, isFemale: Boolean(selected && isFemale(selected)) };
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
  const synthesis = speechWindow.speechSynthesis;
  const Utterance = speechWindow.SpeechSynthesisUtterance;
  const selection = selectSpeechVoice(synthesis.getVoices(), lang);
  synthesis.cancel();
  const utterance = new Utterance(text);
  utterance.lang = lang;
  utterance.voice = selection.voice;
  utterance.rate = lang.toLowerCase().startsWith("zh") ? 0.74 : 0.8;
  utterance.pitch = lang.toLowerCase().startsWith("zh") ? (selection.isFemale ? 1.12 : 1.22) : 1.03;
  utterance.volume = 1;
  synthesis.speak(utterance);
}

function legacySpeak(text: string, lang = "zh-CN") {
  const speechWindow = window as unknown as {
    speechSynthesis?: SpeechSynthesis;
    SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
    alert: (message: string) => void;
  };
  if (!speechWindow.speechSynthesis || !speechWindow.SpeechSynthesisUtterance) {
    speechWindow.alert("当前浏览器暂不支持语音播放，请使用手机自带浏览器、Chrome 或 Safari 打开。");
    return;
  }
  const voiceRequestId = ++speechVoiceRequestId;
  if (!speechWindow.speechSynthesis.getVoices().length) {
    const retryWhenVoicesReady = () => {
      speechWindow.speechSynthesis?.removeEventListener("voiceschanged", retryWhenVoicesReady);
      if (voiceRequestId === speechVoiceRequestId) speak(text, lang);
    };
    speechWindow.speechSynthesis.addEventListener("voiceschanged", retryWhenVoicesReady, { once: true });
    window.setTimeout(() => {
      speechWindow.speechSynthesis?.removeEventListener("voiceschanged", retryWhenVoicesReady);
      if (voiceRequestId === speechVoiceRequestId) speak(text, lang);
    }, 800);
    return;
  }
  speechWindow.speechSynthesis.cancel();
  const utterance = new speechWindow.SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voices = speechWindow.speechSynthesis.getVoices();
  const languageVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const preferredNames = lang.startsWith("zh")
    ? ["Xiaoxiao", "晓晓", "Xiaoyi", "晓伊", "Ting-Ting", "Mei-Jia", "Yaoyao", "Huihui", "Google 普通话"]
    : lang === "en-GB"
      ? ["Sonia", "Libby", "Serena", "Stephanie", "Google UK English Female", "Jenny", "Samantha"]
      : ["Jenny", "Samantha", "Aria", "Ava", "Google US English"];
  const mobileFemaleVoice = languageVoices.find((voice) => {
    const label = `${voice.name} ${voice.voiceURI}`;
    return /xiaoxiao|xiaoyi|ting[- ]?ting|mei[- ]?jia|yaoyao|huihui|siri.*female|female|woman|女声/i.test(label)
      && !/yunxi|yunyang|yunjian|yunfeng|google.*普通话|male|man|云希|云扬|云健|云枫/i.test(label);
  });
  const preferredVoice = preferredNames
    .map((name) => languageVoices.find((voice) => voice.name.includes(name)))
    .find((voice) => voice && !/yunxi|yunyang|yunjian|yunfeng|google.*普通话|male|man|云希|云扬|云健|云枫/i.test(`${voice.name} ${voice.voiceURI}`))
    ?? mobileFemaleVoice;
  const femaleVoice = languageVoices.find((voice) => /female|woman|女|xiaoxiao|xiaoyi|ting-ting|mei-jia|yaoyao|huihui/i.test(voice.name));
  const selectedFemaleVoice = mobileFemaleVoice ?? femaleVoice ?? preferredVoice;
  utterance.voice = selectedFemaleVoice ?? languageVoices[0] ?? null;
  utterance.rate = lang.startsWith("zh") ? 0.74 : 0.8;
  utterance.pitch = lang.startsWith("zh") ? (selectedFemaleVoice ? 1.12 : 1.2) : 1.03;
  utterance.volume = 1;
  speechWindow.speechSynthesis.speak(utterance);
}

function MorningReading({ dateKey }: { dateKey: string }) {
  const content = getWeeklyContent(dateFromKey(dateKey));
  const readingDate = dateFromKey(dateKey);
  const dayNumber = Math.floor(Date.UTC(readingDate.getFullYear(), readingDate.getMonth(), readingDate.getDate()) / 86400000);
  const poem = chineseReadings[dayNumber % chineseReadings.length];
  return (
    <div className="panel-list">
      <div className="content-grid">
        <article className="panel"><h3>{poem.title}</h3><p className="muted">{poem.author} · 公版古诗</p>{poem.lines.map((line) => <p className="poem-line" key={line}>{line}</p>)}<p className="reading-tip">朗读小提示：{poem.readingTip}</p><div className="focus-chips">{poem.focus.map((word) => <span key={word}>{word}</span>)}</div><button className="secondary" onClick={() => speak(poem.lines.join(""))}><Play size={16} />跟读播放</button></article>
        <article className="panel"><h3>{content.readingTitle}</h3><p>{content.readingText}</p><p className="muted">本周生字：{content.words.map((item) => `${item.word}-${item.group}`).join("、")}</p><button className="secondary" onClick={() => speak(content.readingText)}><Play size={16} />课文跟读</button></article>
      </div>
    </div>
  );
}

function CopybookPreview({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const content = getWeeklyContent(dateFromKey(dateKey));
  const [done, setDone] = usePracticeDraft<boolean>(`copybook:${dateKey}`, false);
  useEffect(() => onProgress({ ready: done, durationSeconds: 0, attempts: 1, wrongQuestions: [], evidence: done ? `${content.words.length}个字，每字练写3遍` : undefined, message: done ? "练字记录完成，可以提交家长审核。" : undefined }), [done, content.words.length, onProgress]);
  return (
    <div className="panel-list">
      <div className="content-grid">{content.words.map((item) => <article className="word-card" key={item.word}><strong>{item.word}</strong><p>{item.pinyin}</p><p>{item.strokes}</p><p>{item.group}</p><div className="copybook-tracing" aria-label={`${item.word}三遍描红`} role="group">{[1, 2, 3].map((round) => <span className="copybook-trace-cell" key={round} aria-label={`第${round}遍描红`}>{item.word}</span>)}</div><p className="copybook-trace-caption">描红三遍</p></article>)}</div>
      <label className="confirm-check panel"><input type="checkbox" checked={done} onChange={(event) => setDone(event.target.checked)} />我已经每个字认真练写3遍</label>
    </div>
  );
}

function Memorize({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const passages = getWeeklyContent(dateFromKey(dateKey)).memorization;
  const [passed, setPassed] = usePracticeDraft<boolean[]>(`memorize:${dateKey}`, passages.map(() => false));
  const ready = passed.every(Boolean);
  useEffect(() => onProgress({ ready, durationSeconds: 0, attempts: 1, wrongQuestions: [], evidence: `已勾选${passed.filter(Boolean).length}/${passages.length}段`, message: ready ? "背诵闯关完成，可以提交家长审核。" : undefined }), [ready, passed, passages.length, onProgress]);
  return <div className="panel-list">{passages.map((line, index) => <article className="panel" key={line}><h3>第{index + 1}关</h3><p className="poem-line">{line}</p><div className="inline-actions"><button className="secondary" onClick={() => speak(line)}><Play size={16} />听一遍</button><label className="mini-check"><input type="checkbox" checked={passed[index]} onChange={(event) => setPassed(passed.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))} />已背会</label></div></article>)}</div>;
}

function Dictation({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const words = getWeeklyContent(dateFromKey(dateKey)).dictation;
  const [index, setIndex] = usePracticeDraft<number>(`dictation:${dateKey}:index`, 0);
  const [showAnswers, setShowAnswers] = usePracticeDraft<boolean>(`dictation:${dateKey}:answers`, false);
  const [ratings, setRatings] = usePracticeDraft<Record<number, "correct" | "retry">>(`dictation:${dateKey}:ratings`, {});
  const [replayedIndices, setReplayedIndices] = usePracticeDraft<number[]>(`dictation:${dateKey}:replayed`, []);
  const [replayCount, setReplayCount] = usePracticeDraft<number>(`dictation:${dateKey}:replay-count`, 0);
  const current = words[index];
  const playCurrent = () => speak(`请写：${current}`);
  const replayWrongWord = (wordIndex: number) => {
    speak(`请再写一次：${words[wordIndex]}`);
    setReplayedIndices((values) => values.includes(wordIndex) ? values : [...values, wordIndex]);
    setReplayCount((value) => value + 1);
  };
  const next = () => {
    if (index >= words.length - 1) setShowAnswers(true);
    else {
      setIndex(index + 1);
      window.setTimeout(() => speak(`请写：${words[index + 1]}`), 250);
    }
  };
  const wrongIndices = useMemo(() => words.map((_, wordIndex) => ratings[wordIndex] === "retry" ? wordIndex : -1).filter((wordIndex) => wordIndex >= 0), [ratings, words]);
  const allAssessed = words.every((_, wordIndex) => ratings[wordIndex]);
  const allWrongReplayed = wrongIndices.every((wordIndex) => replayedIndices.includes(wordIndex));
  const ready = showAnswers && allAssessed && allWrongReplayed;
  useEffect(() => onProgress({
    ready,
    durationSeconds: 0,
    attempts: 1 + replayCount,
    wrongQuestions: wrongIndices.map((wordIndex) => `听写：${words[wordIndex]}`),
    evidence: showAnswers ? `${words.length}个词，写对${words.length - wrongIndices.length}个，错词重听${replayCount}次` : undefined,
    message: ready ? "听写自评和错词重听完成，可以提交家长审核。" : showAnswers && !allAssessed ? "请给每个词标记“会写”或“需再练”。" : showAnswers && !allWrongReplayed ? "把标记为“需再练”的词重新听一遍。" : undefined,
  }), [allAssessed, allWrongReplayed, onProgress, ready, replayCount, showAnswers, words, wrongIndices]);
  return <div className="panel dictation"><h3>语音听写</h3><p>当前第 {index + 1} / {words.length} 个。播放后留出书写时间，可重复播放。</p><div className="dictation-word">{showAnswers ? "逐词核对" : "请听语音写词语"}</div>{!showAnswers ? <div className="inline-actions"><button className="primary" onClick={playCurrent}><Play size={16} />播放词语</button><button className="secondary" onClick={playCurrent}><RotateCcw size={16} />重复播放</button><button className="secondary" onClick={next}>{index >= words.length - 1 ? "显示答案并自评" : "下一个"}</button></div> : <div className="dictation-review-list">{words.map((word, wordIndex) => <div className="dictation-review-row" key={word}><strong>{word}</strong><div className="dictation-rating" role="group" aria-label={`${word}听写自评`}><button className={ratings[wordIndex] === "correct" ? "selected correct" : "secondary"} onClick={() => setRatings((values) => ({ ...values, [wordIndex]: "correct" }))}>会写</button><button className={ratings[wordIndex] === "retry" ? "selected retry" : "secondary"} onClick={() => setRatings((values) => ({ ...values, [wordIndex]: "retry" }))}>需再练</button></div>{ratings[wordIndex] === "retry" ? <button className={replayedIndices.includes(wordIndex) ? "secondary replayed" : "secondary"} onClick={() => replayWrongWord(wordIndex)}><Play size={15} />{replayedIndices.includes(wordIndex) ? "已重听" : "重听一次"}</button> : null}</div>)}</div>}</div>;
}

function NightReading({ dateKey }: { dateKey: string }) {
  const passage = getNightReading(dateFromKey(dateKey));
  return <div className="panel-list"><article className="panel"><p className="eyebrow">适龄课外阅读 · 约400字</p><h3>{passage.title}</h3><p>{passage.text}</p><button className="secondary" onClick={() => speak(passage.text)}><Play size={16} />听读全文</button></article></div>;
}

function PictureWriting({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const picture = getWeeklyContent(dateFromKey(dateKey)).picture;
  const [text, setText] = usePracticeDraft<string>(`picture-writing:${dateKey}`, "");
  const ready = text.replace(/\s/g, "").length >= 10;
  useEffect(() => onProgress({ ready, durationSeconds: 0, attempts: 1, wrongQuestions: [], evidence: ready ? `看图写话${text.replace(/\s/g, "").length}字` : undefined, message: ready ? "已经写够2–4句话，可以提交家长审核。" : undefined }), [ready, text, onProgress]);
  return <div className="panel"><h3>情景：{picture.title}</h3><div className="picture-scene">{picture.scene}</div><p>提示词：{picture.hints}</p><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="写2–4句话，先写看到了什么，再写大家在做什么。" /><details><summary>完成后查看范文</summary><p>{picture.example}</p></details></div>;
}

function ReadingComprehensionPanel({ dateKey, onProgress }: { dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const date = dateFromKey(dateKey);
  const weekNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 604800000);
  const item = readingComprehensions[weekNumber % readingComprehensions.length];
  const [answers, setAnswers] = usePracticeDraft<Record<string, string>>(`reading-comprehension:${dateKey}:answers`, {});
  const [checked, setChecked] = usePracticeDraft<boolean>(`reading-comprehension:${dateKey}:checked`, false);
  const [attempts, setAttempts] = usePracticeDraft<number>(`reading-comprehension:${dateKey}:attempts`, 0);
  const [missingHints, setMissingHints] = usePracticeDraft<Record<string, string[]>>(`reading-comprehension:${dateKey}:hints`, {});
  const changeAnswer = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setChecked(false);
    onProgress({ ...emptyOutcome, attempts, message: "答案已修改，请重新核对。" });
  };
  const check = () => {
    const results = item.questions.map((questionValue) => {
      const question = questionValue as ReadingQuestion;
      if (question.type === "choice") return { question, correct: answers[question.id] === question.answer, missing: [] as string[] };
      const match = matchKeywordGroups(answers[question.id] ?? "", question.keywordGroups ?? [[question.answer]]);
      return { question, correct: match.correct, missing: match.missingGroups.map((group) => group[0]) };
    });
    const correct = results.filter((result) => result.correct).length;
    const score = Math.round((correct / item.questions.length) * 100);
    const nextAttempts = attempts + 1;
    setChecked(true);
    setAttempts(nextAttempts);
    setMissingHints(Object.fromEntries(results.filter((result) => result.missing.length).map((result) => [result.question.id, result.missing])));
    onProgress({ ready: score >= 80, score, durationSeconds: 0, attempts: nextAttempts, wrongQuestions: results.filter((result) => !result.correct).map((result) => result.question.prompt), message: score >= 80 ? `正确率${score}%，已经达标。` : `正确率${score}%，补全要点再试一次。` });
  };
  return <div className="panel"><h3>{item.title}</h3>{item.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{item.questions.map((question) => <div className="question" key={question.id}><p>{question.prompt}</p>{question.options ? question.options.map((option) => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => changeAnswer(question.id, option)} />{option}</label>) : <input value={answers[question.id] ?? ""} onChange={(event) => changeAnswer(question.id, event.target.value)} placeholder="用一句话回答" />}{checked && missingHints[question.id]?.length ? <p className="gentle-retry">还缺少这些要点：{missingHints[question.id].join("、")}</p> : null}{checked ? <p className="answer">参考答案：{question.answer}。{question.explanation}</p> : null}</div>)}<button className="secondary" onClick={check}>核对答案解析</button></div>;
}

function Arithmetic({ dateKey, existingResult, masteredQuestionKeys, onProgress }: { dateKey: string; existingResult?: TaskResult; masteredQuestionKeys: string[]; onProgress: (outcome: TaskOutcome) => void }) {
  const questions = useMemo(() => generateArithmetic(dateKey, 20, masteredQuestionKeys), [dateKey, masteredQuestionKeys]);
  const [answers, setAnswers] = usePracticeDraft<Record<number, string>>(`arithmetic:${dateKey}:answers`, Object.fromEntries(Object.entries(existingResult?.answers ?? {}).map(([index, answer]) => [Number(index), answer])));
  const [attempts, setAttempts] = usePracticeDraft<number>(`arithmetic:${dateKey}:attempts`, 0);
  const [initialWrongIndices, setInitialWrongIndices] = usePracticeDraft<number[] | null>(`arithmetic:${dateKey}:initial-wrong`, null);
  const [retryIndices, setRetryIndices] = usePracticeDraft<number[]>(`arithmetic:${dateKey}:retry`, []);
  const displayedIndices = initialWrongIndices === null ? questions.map((_, index) => index) : retryIndices;
  const allDisplayedAnswersFilled = areAllArithmeticAnswersFilled(questions, answers, displayedIndices);
  const check = () => {
    if (!allDisplayedAnswersFilled) return;
    const nextAttempts = attempts + 1;
    const answerSnapshot = Object.fromEntries(Object.entries(answers));
    setAttempts(nextAttempts);
    if (initialWrongIndices === null) {
      const wrong = findWrongArithmeticIndices(questions, answers);
      const firstScore = arithmeticScore(questions.length, wrong.length);
      setInitialWrongIndices(wrong);
      setRetryIndices(wrong);
      onProgress({ ready: wrong.length === 0, score: firstScore, firstScore, durationSeconds: 0, attempts: nextAttempts, wrongQuestions: wrong.map((wrongIndex) => questions[wrongIndex].prompt), correctQuestions: questions.filter((_, index) => !wrong.includes(index)).map((question) => question.prompt), answers: answerSnapshot, message: wrong.length ? `首次正确率${firstScore}%，请完成${wrong.length}道错题重练。` : "20道全部答对，可以完成任务。" });
      return;
    }
    const unresolved = findWrongArithmeticIndices(questions, answers, retryIndices);
    const firstScore = arithmeticScore(questions.length, initialWrongIndices.length);
    const score = arithmeticScore(questions.length, unresolved.length);
    setRetryIndices(unresolved);
    onProgress({ ready: unresolved.length === 0, score, firstScore, durationSeconds: 0, attempts: nextAttempts, wrongQuestions: initialWrongIndices.map((wrongIndex) => questions[wrongIndex].prompt), correctQuestions: questions.filter((_, index) => !unresolved.includes(index)).map((question) => question.prompt), answers: answerSnapshot, message: unresolved.length ? `已经改对一些，还有${unresolved.length}道再算一次。` : "错题已经全部改对，可以完成任务。" });
  };
  return <div className="panel"><h3>{initialWrongIndices === null ? "100以内正整数加减法 20道" : retryIndices.length ? `错题专项重练 ${retryIndices.length}道` : "错题全部改对"}</h3>{displayedIndices.length ? <div className="arithmetic-grid">{displayedIndices.map((questionIndex) => { const question = questions[questionIndex]; return <label key={`${question.prompt}-${questionIndex}`}><span>{question.prompt}</span><input type="number" inputMode="numeric" pattern="[0-9]*" min="0" step="1" value={answers[questionIndex] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [questionIndex]: event.target.value.replace(/\D/g, "") }))} /></label>; })}</div> : <div className="mastery-finish"><CheckCircle2 size={30} /><strong>每一道错题都认真改正啦</strong></div>}<button className="primary" disabled={!allDisplayedAnswersFilled || (initialWrongIndices !== null && retryIndices.length === 0)} onClick={check}>{initialWrongIndices === null ? "核对答案" : "核对错题"}</button></div>;
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

interface AutoPracticeItem {
  prompt: string;
  answer: string;
  unit?: string;
  isCorrect?: (input: string) => boolean;
}

function AutoPractice({ title, items, guide, placeholder = "写答案", draftKey, masteredQuestionKeys = [], onProgress }: { title: string; items: AutoPracticeItem[]; guide?: string; placeholder?: string; draftKey: string; masteredQuestionKeys?: string[]; onProgress: (outcome: TaskOutcome) => void }) {
  const freshItems = useMemo(() => {
    const remaining = items.filter((item) => !masteredQuestionKeys.includes(item.prompt));
    return remaining.length ? remaining : items;
  }, [items, masteredQuestionKeys]);
  const [answers, setAnswers] = usePracticeDraft<Record<number, string>>(`${draftKey}:answers`, {});
  const [checked, setChecked] = usePracticeDraft<boolean>(`${draftKey}:checked`, false);
  const [attempts, setAttempts] = usePracticeDraft<number>(`${draftKey}:attempts`, 0);
  const check = () => {
    const wrong = freshItems.map((item, index) => (item.isCorrect?.(answers[index] ?? "") ?? answerMatches(answers[index] ?? "", item.answer)) ? "" : item.prompt).filter(Boolean);
    const score = Math.round(((freshItems.length - wrong.length) / freshItems.length) * 100);
    const nextAttempts = attempts + 1;
    setChecked(true);
    setAttempts(nextAttempts);
    onProgress({ ready: score >= 80, score, durationSeconds: 0, attempts: nextAttempts, wrongQuestions: wrong, correctQuestions: freshItems.filter((item) => !wrong.includes(item.prompt)).map((item) => item.prompt), message: score >= 80 ? `正确率${score}%，已经达标。` : `正确率${score}%，再试一次会更好。` });
  };
  const changeAnswer = (index: number, value: string) => {
    setAnswers((current) => ({ ...current, [index]: value }));
    setChecked(false);
    onProgress({ ...emptyOutcome, attempts, message: "答案已修改，请重新核对。" });
  };
  return <div className="panel"><h3>{title}</h3>{guide ? <p className="practice-guide">{guide}</p> : null}{freshItems.map(({ prompt, answer }, index) => <div className="question" key={`${prompt}-${index}`}><p>{prompt}</p><input value={answers[index] ?? ""} onChange={(event) => changeAnswer(index, event.target.value)} placeholder={placeholder} />{checked ? <p className="answer">答案：{answer}</p> : null}</div>)}<button className="secondary" onClick={check}>{attempts ? "重新核对" : "核对答案"}</button></div>;
}

function WordProblemPractice({ items, guide, draftKey, masteredQuestionKeys = [], onProgress }: { items: AutoPracticeItem[]; guide: string; draftKey: string; masteredQuestionKeys?: string[]; onProgress: (outcome: TaskOutcome) => void }) {
  const freshItems = useMemo(() => {
    const remaining = items.filter((item) => !masteredQuestionKeys.includes(item.prompt));
    return remaining.length ? remaining : items;
  }, [items, masteredQuestionKeys]);
  const [answers, setAnswers] = usePracticeDraft<Record<number, string>>(`${draftKey}:answers`, {});
  const [checked, setChecked] = usePracticeDraft<boolean>(`${draftKey}:checked`, false);
  const [attempts, setAttempts] = usePracticeDraft<number>(`${draftKey}:attempts`, 0);
  const changeAnswer = (index: number, value: string) => {
    setAnswers((current) => ({ ...current, [index]: value }));
    setChecked(false);
    onProgress({ ...emptyOutcome, attempts, message: "答案已修改，请重新核对。" });
  };
  const appendUnit = (index: number, unit: string) => {
    const current = answers[index] ?? "";
    const withoutUnit = current.replace(/[（(][\u4e00-\u9fff]+[）)]$/, "").trimEnd();
    changeAnswer(index, `${withoutUnit}（${unit}）`);
  };
  const check = () => {
    const wrong = freshItems.map((item, index) => item.isCorrect?.(answers[index] ?? "") ? "" : item.prompt).filter(Boolean);
    const score = Math.round(((freshItems.length - wrong.length) / freshItems.length) * 100);
    const nextAttempts = attempts + 1;
    setChecked(true);
    setAttempts(nextAttempts);
    onProgress({ ready: score >= 80, score, durationSeconds: 0, attempts: nextAttempts, wrongQuestions: wrong, correctQuestions: freshItems.filter((item) => !wrong.includes(item.prompt)).map((item) => item.prompt), message: score >= 80 ? `正确率${score}%，已经达标。` : `正确率${score}%，再检查算式和单位。` });
  };
  return <div className="panel"><h3>生活化应用题</h3><p className="practice-guide">{guide}</p>{freshItems.map((item, index) => { const unit = item.answer.match(/[（(]([\u4e00-\u9fff]+)[）)]$/)?.[1]; return <div className="question" key={`${item.prompt}-${index}`}><p>{item.prompt}</p><input value={answers[index] ?? ""} onChange={(event) => changeAnswer(index, event.target.value)} placeholder="例如：18+7=25" />{unit ? <div className="unit-picker" aria-label="选择答案单位"><span>答案单位：</span><button type="button" className="secondary" onClick={() => appendUnit(index, unit)}>（{unit}）</button></div> : null}{checked ? <p className="answer">答案：{item.answer}</p> : null}</div>; })}<button className="secondary" onClick={check}>{attempts ? "重新核对" : "核对答案"}</button></div>;
}

function MultiplyDivide({ dateKey, masteredQuestionKeys, onProgress }: { dateKey: string; masteredQuestionKeys: string[]; onProgress: (outcome: TaskOutcome) => void }) {
  const daySeed = Math.floor(Date.UTC(dateFromKey(dateKey).getFullYear(), dateFromKey(dateKey).getMonth(), dateFromKey(dateKey).getDate()) / 86400000);
  const facts = Array.from({ length: 30 }, (_, index) => ({ first: 1 + (index % 6), second: 1 + Math.floor(index / 6) }));
  const selected = Array.from({ length: 5 }, (_, index) => facts[(daySeed * 5 + index) % facts.length]);
  const items = selected.flatMap(({ first, second }) => [
    { prompt: `${first} × ${second} =`, answer: String(first * second) },
    { prompt: `${first * second} ÷ ${first} =`, answer: String(second) },
  ]);
  return <AutoPractice title="1–6乘法口诀 · 每日10题" draftKey={`multiply-divide:${dateKey}`} masteredQuestionKeys={masteredQuestionKeys} onProgress={onProgress} items={items} />;
}

function WordProblems({ dateKey, masteredQuestionKeys, onProgress }: { dateKey: string; masteredQuestionKeys: string[]; onProgress: (outcome: TaskOutcome) => void }) {
  const offset = (Math.floor(Date.UTC(dateFromKey(dateKey).getFullYear(), dateFromKey(dateKey).getMonth(), dateFromKey(dateKey).getDate()) / 86400000) * 5) % wordProblems.length;
  const items = [...wordProblems.slice(offset), ...wordProblems.slice(0, offset)].slice(0, 5).map((problem) => ({ prompt: problem.prompt, answer: problem.answer, isCorrect: (input: string) => wordProblemAnswerMatches(input, problem) }));
  if (items.some((item) => /[（(][\u4e00-\u9fff]+[）)]$/.test(item.answer))) return <WordProblemPractice items={items} masteredQuestionKeys={masteredQuestionKeys} guide="每题都要列出完整算式，点击单位按钮把单位追加到得数后面。" draftKey={`word-problems:${dateKey}`} onProgress={onProgress} />;
  return <AutoPractice title="生活化应用题" guide="每题都要列出完整算式，并在得数后写上单位。" placeholder="例如：18+7=25（张）" draftKey={`word-problems:${dateKey}`} masteredQuestionKeys={masteredQuestionKeys} items={items} onProgress={onProgress} />;
}

function EnglishDaily({ dateKey }: { dateKey: string }) {
  const lesson = getWeeklyContent(dateFromKey(dateKey)).english;
  return (
    <div className="panel-list">
      <article className="panel english-lesson-head">
        <p className="eyebrow">译林版二年级上册主题预习 · 原创例句</p>
        <h3>{lesson.unit} · {lesson.title}</h3>
        <p>本周主题：{lesson.topic} · 6个单词 · 3个核心句型</p>
      </article>
      <article className="panel">
        <h3>核心单词与例句</h3>
        {lesson.words.map((item) => (
          <div className="english-line" key={item.word}>
            <div><strong>{item.word}</strong><span>{item.meaning}</span><p>{item.sentence}</p></div>
            <div className="inline-actions">
              <button className="secondary" onClick={() => speak(item.word, "en-GB")}><Play size={16} />单词</button>
              <button className="secondary" onClick={() => speak(item.sentence, "en-GB")}><Play size={16} />例句</button>
            </div>
          </div>
        ))}
      </article>
      <EnglishWordReview lesson={lesson} />
      <EnglishListeningGame lesson={lesson} dateKey={dateKey} />
      <article className="panel">
        <h3>核心句型</h3>
        <div className="english-patterns">
          {lesson.patterns.map((pattern) => (
            <div key={pattern.sentence}>
              <p><strong>{pattern.sentence}</strong></p>
              <p>{pattern.meaning}</p>
              <button className="secondary" onClick={() => speak(pattern.sentence, "en-GB")}><Play size={16} />听句型</button>
            </div>
          ))}
        </div>
      </article>
      <EnglishMeaningQuiz lesson={lesson} dateKey={dateKey} />
      <article className="panel english-chant">
        <div><p className="eyebrow">玉桂狗节奏秀</p><h3>拍手跟读三遍</h3><p>{lesson.chant}</p></div>
        <button className="secondary" onClick={() => speak(lesson.chant, "en-GB")}><Play size={16} />播放节奏句</button>
      </article>
      <EnglishSentenceTrain key={`${lesson.unit}-${dateKey}`} lesson={lesson} dateKey={dateKey} />
      <article className="panel">
        <h3>今日跟读任务</h3>
        <ol className="practice-steps">{lesson.tasks.map((task) => <li key={task}>{task}</li>)}</ol>
      </article>
    </div>
  );
}

function EnglishWordReview({ lesson }: { lesson: ReturnType<typeof getWeeklyContent>["english"] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const word = lesson.words[index];

  const next = () => {
    setIndex((value) => (value + 1) % lesson.words.length);
    setRevealed(false);
  };

  return (
    <article className="panel english-word-review">
      <div className="listening-head"><div><p className="eyebrow">复习闪卡 · 先想一想再翻开</p><h3>单词回忆 {index + 1}/{lesson.words.length}</h3></div><strong>{word.word}</strong></div>
      <div className="english-flashcard" aria-live="polite">
        <span className="flashcard-word">{word.word}</span>
        {revealed ? <><span className="flashcard-meaning">{word.meaning}</span><span>{word.sentence}</span></> : <span className="flashcard-hidden">先说出中文意思，再点击显示答案</span>}
      </div>
      <div className="inline-actions">
        <button className="secondary" onClick={() => speak(word.word, "en-GB")}><Play size={16} />听发音</button>
        <button className="secondary" onClick={() => setRevealed((value) => !value)}>{revealed ? "合上闪卡" : "显示答案"}</button>
        <button className="primary" onClick={next}><ChevronRight size={16} />下一个</button>
      </div>
    </article>
  );
}

function EnglishMeaningQuiz({ lesson, dateKey }: { lesson: ReturnType<typeof getWeeklyContent>["english"]; dateKey: string }) {
  const [index, setIndex] = usePracticeDraft<number>(`english-meaning:${dateKey}:index`, 0);
  const [selected, setSelected] = usePracticeDraft<string>(`english-meaning:${dateKey}:selected`, "");
  const [score, setScore] = usePracticeDraft<number>(`english-meaning:${dateKey}:score`, 0);
  const [finished, setFinished] = usePracticeDraft<boolean>(`english-meaning:${dateKey}:finished`, false);
  const pattern = lesson.patterns[index];
  const options = useMemo(() => {
    const distractors = lesson.patterns.filter((item) => item.sentence !== pattern.sentence).map((item) => item.sentence);
    return [pattern.sentence, ...distractors].sort((a, b) => a.localeCompare(b, "en"));
  }, [lesson.patterns, pattern.sentence]);

  const choose = (sentence: string) => {
    if (selected) return;
    setSelected(sentence);
    if (sentence === pattern.sentence) setScore((value) => value + 1);
  };

  const next = () => {
    if (index === lesson.patterns.length - 1) setFinished(true);
    else setIndex((value) => value + 1);
    setSelected("");
  };

  const restart = () => {
    setIndex(0);
    setSelected("");
    setScore(0);
    setFinished(false);
  };

  return (
    <article className="panel english-meaning-quiz">
      <div className="listening-head"><div><p className="eyebrow">句意理解 · 把中文意思配成英文</p><h3>句子小测 {finished ? lesson.patterns.length : index + 1}/{lesson.patterns.length}</h3></div><strong><Star size={18} />{score}</strong></div>
      {finished ? <div className="english-quiz-finish"><h3>本轮完成：{score}/{lesson.patterns.length}</h3><p>{score === lesson.patterns.length ? "全部配对成功，句型已经记住啦。" : "错题再听一遍，再挑战一次会更稳。"}</p><button className="secondary" onClick={restart}><RotateCcw size={16} />再练一轮</button></div> : <><p className="sentence-meaning">{pattern.meaning}</p><div className="english-meaning-options">{options.map((option) => <button className={selected === option ? (option === pattern.sentence ? "correct-choice" : "wrong-choice") : "secondary"} key={option} onClick={() => choose(option)}>{option}</button>)}</div>{selected ? <div className="inline-actions english-quiz-next"><button className="primary" onClick={next}><ChevronRight size={16} />{index === lesson.patterns.length - 1 ? "查看结果" : "下一题"}</button><button className="secondary" onClick={() => speak(pattern.sentence, "en-GB")}><Play size={16} />听一遍</button></div> : null}</>}
    </article>
  );
}

function EnglishListeningGame({ lesson, dateKey }: { lesson: ReturnType<typeof getWeeklyContent>["english"]; dateKey: string }) {
  const [index, setIndex] = usePracticeDraft<number>(`english-listening:${dateKey}:index`, 0);
  const [selected, setSelected] = usePracticeDraft<string>(`english-listening:${dateKey}:selected`, "");
  const [correctCount, setCorrectCount] = usePracticeDraft<number>(`english-listening:${dateKey}:score`, 0);
  const [missed, setMissed] = usePracticeDraft<boolean>(`english-listening:${dateKey}:missed`, false);
  const [finished, setFinished] = usePracticeDraft<boolean>(`english-listening:${dateKey}:finished`, false);
  const word = lesson.words[index];
  const options = useMemo(() => {
    const distractors = lesson.words.filter((item) => item.word !== word.word).map((item) => item.meaning);
    return [word.meaning, ...Array.from({ length: 3 }, (_, optionIndex) => distractors[(index + optionIndex) % distractors.length])]
      .sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [index, lesson.words, word.meaning, word.word]);
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
  const restart = () => {
    setIndex(0);
    setSelected("");
    setCorrectCount(0);
    setMissed(false);
    setFinished(false);
  };

  return (
    <article className="panel english-listening-game">
      <div className="listening-head"><div><p className="eyebrow">趣味加星 · 不影响计时打卡</p><h3>听音辨词 {Math.min(index + 1, lesson.words.length)}/{lesson.words.length}</h3></div><strong><Star size={18} />{correctCount}</strong></div>
      {finished ? <div className="listening-finish"><img src={characterImages.cinnamoroll} alt="" /><div><h3>听音小挑战完成</h3><p>一次听对 {correctCount} 个。多听一次，耳朵会越来越灵。</p><button className="secondary" onClick={restart}><RotateCcw size={16} />再玩一次</button></div></div> : <><button className="primary listen-word" onClick={() => speak(word.word, "en-GB")}><Play size={18} />播放第{index + 1}个单词</button><div className="english-quiz-options">{options.map((option) => <button className={selected === option ? (option === word.meaning ? "correct-choice" : "wrong-choice") : "secondary"} key={option} onClick={() => choose(option)}>{option}</button>)}</div>{selected ? <p className={selected === word.meaning ? "answer" : "gentle-retry"}>{selected === word.meaning ? `听对啦：${word.word} 是“${word.meaning}”。` : "再听一次，不着急。"}</p> : null}</>}
    </article>
  );
}

function EnglishSentenceTrain({ lesson, dateKey }: { lesson: ReturnType<typeof getWeeklyContent>["english"]; dateKey: string }) {
  const [roundIndex, setRoundIndex] = usePracticeDraft<number>(`english-sentence:${dateKey}:round`, 0);
  const [chosenIds, setChosenIds] = usePracticeDraft<number[]>(`english-sentence:${dateKey}:chosen`, []);
  const [feedback, setFeedback] = usePracticeDraft<"idle" | "retry" | "correct">(`english-sentence:${dateKey}:feedback`, "idle");
  const [stars, setStars] = usePracticeDraft<number>(`english-sentence:${dateKey}:stars`, 0);
  const [finished, setFinished] = usePracticeDraft<boolean>(`english-sentence:${dateKey}:finished`, false);
  const pattern = lesson.patterns[roundIndex];
  const tokens = useMemo(() => pattern.sentence.trim().split(/\s+/).map((text, id) => ({ id, text })), [pattern.sentence]);
  const shuffledTokens = useMemo(() => {
    if (tokens.length < 2) return tokens;
    const daySeed = Number(dateKey.replace(/-/g, ""));
    const shift = ((daySeed + roundIndex) % (tokens.length - 1)) + 1;
    return [...tokens.slice(shift), ...tokens.slice(0, shift)];
  }, [dateKey, roundIndex, tokens]);
  const builtSentence = chosenIds.map((id) => tokens[id].text).join(" ");
  const clear = () => {
    setChosenIds([]);
    setFeedback("idle");
  };
  const check = () => {
    const correct = chosenIds.length === tokens.length && chosenIds.every((id, index) => id === index);
    setFeedback(correct ? "correct" : "retry");
    if (correct) setStars((value) => value + 1);
  };
  const next = () => {
    if (roundIndex === lesson.patterns.length - 1) setFinished(true);
    else setRoundIndex((value) => value + 1);
    clear();
  };
  const restart = () => {
    setRoundIndex(0);
    setStars(0);
    setFinished(false);
    clear();
  };

  return (
    <article className="panel english-sentence-game">
      <div className="listening-head"><div><p className="eyebrow">趣味加星 · 单词小火车</p><h3>组句闯关 {Math.min(roundIndex + 1, lesson.patterns.length)}/{lesson.patterns.length}</h3></div><strong><Star size={18} />{stars}</strong></div>
      {finished ? <div className="listening-finish"><img src={characterImages.cinnamoroll} alt="" /><div><h3>三列小火车全部到站</h3><p>今天的核心句型已经拼完啦。</p><button className="secondary" onClick={restart}><RotateCcw size={16} />重新挑战</button></div></div> : <>
        <p className="sentence-meaning">{pattern.meaning}</p>
        <div className={feedback === "correct" ? "sentence-track correct" : "sentence-track"}>{builtSentence || "点击下面的单词，让小火车排好队"}</div>
        <div className="word-token-bank">{shuffledTokens.map((token) => <button className="secondary" disabled={chosenIds.includes(token.id) || feedback === "correct"} key={`${token.text}-${token.id}`} onClick={() => { setChosenIds((value) => [...value, token.id]); setFeedback("idle"); }}>{token.text}</button>)}</div>
        <div className="inline-actions sentence-actions"><button className="secondary" disabled={!chosenIds.length || feedback === "correct"} onClick={clear}><RotateCcw size={16} />重新排列</button>{feedback === "correct" ? <button className="primary" onClick={next}><CheckCircle2 size={16} />{roundIndex === lesson.patterns.length - 1 ? "完成闯关" : "下一句"}</button> : <button className="primary" disabled={chosenIds.length !== tokens.length} onClick={check}>检查顺序</button>}</div>
        {feedback === "correct" ? <p className="answer">顺序正确，收下一颗句型星！</p> : feedback === "retry" ? <p className="gentle-retry">顺序还差一点，重新排一排就好。</p> : null}
      </>}
    </article>
  );
}

function GameTask({ taskId, dateKey, masteredQuestionKeys, onProgress }: { taskId: string; dateKey: string; masteredQuestionKeys: string[]; onProgress: (outcome: TaskOutcome) => void }) {
  const challenges = useMemo(() => getGameChallenges(taskId, dateFromKey(dateKey), 8, masteredQuestionKeys), [taskId, dateKey, masteredQuestionKeys]);
  const [roundIndex, setRoundIndex] = usePracticeDraft<number>(`game:${taskId}:${dateKey}:round`, 0);
  const [selected, setSelected] = usePracticeDraft<string>(`game:${taskId}:${dateKey}:selected`, "");
  const [roundMissed, setRoundMissed] = usePracticeDraft<boolean>(`game:${taskId}:${dateKey}:missed`, false);
  const [roundCorrect, setRoundCorrect] = usePracticeDraft<boolean>(`game:${taskId}:${dateKey}:correct`, false);
  const [firstTryCorrect, setFirstTryCorrect] = usePracticeDraft<number>(`game:${taskId}:${dateKey}:first-score`, 0);
  const [attempts, setAttempts] = usePracticeDraft<number>(`game:${taskId}:${dateKey}:attempts`, 0);
  const [wrongQuestions, setWrongQuestions] = usePracticeDraft<string[]>(`game:${taskId}:${dateKey}:wrong`, []);
  const [combo, setCombo] = usePracticeDraft<number>(`game:${taskId}:${dateKey}:combo`, 0);
  const [finished, setFinished] = usePracticeDraft<boolean>(`game:${taskId}:${dateKey}:finished`, false);
  const [finalScore, setFinalScore] = usePracticeDraft<number>(`game:${taskId}:${dateKey}:score`, 0);
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
      const ready = true;
      setFinalScore(score);
      setFinished(true);
      onProgress({ ready, score, durationSeconds: 0, attempts: nextAttempts, wrongQuestions, correctQuestions: challenges.map((item) => item.question), message: ready ? `首次答对${nextFirstTryCorrect}关，成功获得积分资格！` : `首次答对${nextFirstTryCorrect}关，再玩一次就能进步。` });
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
          <GameRound key={challenge.question} challenge={challenge} draftKey={`game-order:${taskId}:${dateKey}:${challenge.question}`} selected={selected} correct={roundCorrect} onBegin={() => setSelected("")} onSubmit={choose} />
          {selected ? <p className={roundCorrect ? "answer game-feedback" : "gentle-retry game-feedback"}>{roundCorrect ? (roundMissed ? "找到了！认真改正也很棒。" : "一次答对，收下一颗连胜星！") : "再试一次：看看画面里的线索。"}</p> : <p className="muted game-feedback">按画面提示完成这一关。</p>}
          {roundCorrect && roundIndex < challenges.length - 1 ? <button className="primary game-next" onClick={nextRound}>下一关 <ArrowLeft className="next-arrow" size={18} /></button> : null}
        </>
      )}
    </article>
  );
}

function GameRound({ challenge, draftKey, selected, correct, onBegin, onSubmit }: { challenge: GameChallenge; draftKey: string; selected: string; correct: boolean; onBegin: () => void; onSubmit: (answer: string) => void }) {
  if (challenge.kind === "classify") return <div className="game-interaction classify-game"><div className="game-character"><img src={characterImages["my-melody"]} alt="" /><span>{challenge.item}</span></div><p>{challenge.question}</p><div className="game-baskets" role="group" aria-label="汉字分类篮子">{challenge.baskets.map((basket) => <button className={selected === basket ? (correct ? "correct-choice" : "wrong-choice") : ""} disabled={correct} key={basket} onClick={() => onSubmit(basket)}><span>{basket === "人物" ? "人物篮" : basket === "地点" ? "地点篮" : "动作篮"}</span></button>)}</div></div>;
  if (challenge.kind === "number-path") return <div className="game-interaction number-path-game"><p>{challenge.question}</p><div className="number-route">{challenge.path.map((value, index) => <span className={value === null ? "missing" : ""} key={`${value}-${index}`}>{value ?? "?"}</span>)}</div><div className="number-candidates" role="group" aria-label="数字路线候选答案">{challenge.options.map((option) => <button className={selected === String(option) ? (correct ? "correct-choice" : "wrong-choice") : ""} disabled={correct} key={option} onClick={() => onSubmit(String(option))}>{option}</button>)}</div></div>;
  if (challenge.kind === "spot") return <div className="game-interaction spot-game"><p>{challenge.question}</p><div className="spot-grid" role="group" aria-label="找不同九宫格">{challenge.tiles.map((tile, index) => <button aria-label={`第${index + 1}格 ${tile}`} className={selected === String(index) ? (correct ? "correct-choice" : "wrong-choice") : ""} disabled={correct} key={`${tile}-${index}`} onClick={() => onSubmit(String(index))}>{tile}</button>)}</div></div>;
  return <LogicOrderGame challenge={challenge} draftKey={draftKey} selected={selected} correct={correct} onBegin={onBegin} onSubmit={onSubmit} />;
}

function LogicOrderGame({ challenge, draftKey, selected, correct, onBegin, onSubmit }: { challenge: Extract<GameChallenge, { kind: "order" }>; draftKey: string; selected: string; correct: boolean; onBegin: () => void; onSubmit: (answer: string) => void }) {
  const [orderedCards, setOrderedCards] = usePracticeDraft<string[]>(draftKey, []);
  useEffect(() => {
    if (selected && !correct) setOrderedCards([]);
  }, [correct, selected]);
  const chooseCard = (card: string) => {
    if (!orderedCards.length) onBegin();
    setOrderedCards((cards) => [...cards, card]);
  };
  return <div className="game-interaction order-game"><div className="logic-clue"><img src={characterImages.kuromi} alt="" /><p>{challenge.question}</p></div><div className={correct ? "order-track correct" : "order-track"}>{challenge.correctOrder.map((_, index) => <span key={index}>{orderedCards[index] ?? index + 1}</span>)}</div><div className="order-cards">{challenge.cards.map((card) => <button className="secondary" disabled={correct || orderedCards.includes(card)} key={card} onClick={() => chooseCard(card)}>{card}</button>)}</div><div className="inline-actions"><button className="secondary" disabled={correct || !orderedCards.length} onClick={() => { setOrderedCards([]); onBegin(); }}><RotateCcw size={16} />重新排序</button><button className="primary" disabled={correct || orderedCards.length !== challenge.cards.length} onClick={() => onSubmit(orderedCards.join("|"))}>检查顺序</button></div></div>;
}

function SportTask({ taskId, dateKey, onProgress }: { taskId: string; dateKey: string; onProgress: (outcome: TaskOutcome) => void }) {
  const config = taskId === "sport-rope" ? { title: "跳绳500个", target: 500, unit: "个" } : taskId === "sport-high-jump" ? { title: "摸高跳100个", target: 100, unit: "个" } : { title: "累计运动60分钟", target: 60, unit: "分钟" };
  const [value, setValue] = usePracticeDraft<string>(`sport:${taskId}:${dateKey}`, "");
  const ready = Number(value) >= config.target;
  useEffect(() => onProgress({ ready, durationSeconds: taskId === "sport-hour" ? Number(value) * 60 : 0, attempts: 1, wrongQuestions: [], evidence: value ? `填写完成${value}${config.unit}` : undefined, message: ready ? "运动目标达成，可以提交家长审核。" : undefined }), [ready, value, taskId, config.unit, onProgress]);
  return <div className="panel"><h3>{config.title}</h3><p>运动前先热身，完成后提交到今日家长审核。动作不舒服时应立即停止。</p><label>完成数量或时长（{config.unit}）<input className="wide-input" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))} placeholder={`目标${config.target}${config.unit}`} /></label></div>;
}

type PetSceneHotspotId = "food" | "apple" | "bell" | "bath";

interface PetSceneHotspotDefinition {
  id: PetSceneHotspotId;
  action: PetAction;
  itemId: PetItemId;
  label: string;
  className: string;
  emptyMessage: string;
}

export const petSceneHotspots: readonly PetSceneHotspotDefinition[] = [
  { id: "food", action: "feed", itemId: "parrot-food", label: "食盆", className: "food", emptyMessage: "饭盆空啦，嘟嘟决定啃两口鸟架。" },
  { id: "apple", action: "feed", itemId: "apple-bites", label: "苹果", className: "apple", emptyMessage: "苹果还没补货，嘟嘟先把笑容收起来。" },
  { id: "bell", action: "play", itemId: "bell-toy", label: "铃铛", className: "bell", emptyMessage: "铃铛还没买到，嘟嘟先用翅膀打节拍。" },
  { id: "bath", action: "bathe", itemId: "bath-spray", label: "浴盆", className: "bath", emptyMessage: "羽毛水疗用品告急，嘟嘟暂时拒绝出浴。" },
];

export const petHotspotIsAvailable = (pet: Pick<PetState, "inventory" | "ownedToys">, itemId: PetItemId) => itemId === "bell-toy"
  ? pet.ownedToys.includes(itemId)
  : (pet.inventory[itemId] ?? 0) > 0;

const petSceneLines: Record<PetSceneHotspotId, string[]> = {
  food: ["开饭开饭！嘟嘟的饭盆今天准时营业。", "这一口很专业，嘟嘟给你盖章五星好饭。", "别看我小，饭量可是有鸟格的。"],
  apple: ["苹果粒到嘴，嘟嘟宣布今天是甜甜的一天。", "咔嚓！这口苹果比铃铛还响。", "嘟嘟吃完这颗，马上恢复可爱营业。"],
  bell: ["叮叮当！嘟嘟的鸟架演唱会开场啦。", "请欣赏嘟嘟的铃铛独奏，掌声不许停。", "铃声一响，嘟嘟的脚就自动开始蹦迪。"],
  bath: ["水花退散！嘟嘟现在闪亮得可以当小灯泡。", "羽毛洗好了，今天也要神气登场。", "嘟嘟洗完澡，连风都要排队来摸羽毛。"],
};

const petPurchaseLines = ["新货到架！嘟嘟批准这次消费。", "积分变成用品啦，嘟嘟马上安排上。", "快递到达鸟架，嘟嘟准备拆箱表演。"];

const choosePetLine = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)];

function PetPage({ state, setState, cloud, onToast }: { state: WorkspaceState; setState: (state: WorkspaceState) => void; cloud: CloudWorkspaceController; onToast: (message: string) => void }) {
  const [busy, setBusy] = useState("");
  const [motion, setMotion] = useState<PetLastAction>("idle");
  const [motionKey, setMotionKey] = useState(0);
  const [dialogueOverride, setDialogueOverride] = useState("");
  const motionTimer = useRef<number | null>(null);
  const dialogueTimer = useRef<number | null>(null);
  const pet = state.pet;
  const itemCount = (itemId: PetItemId) => pet.inventory[itemId] ?? 0;

  useEffect(() => () => {
    if (motionTimer.current) window.clearTimeout(motionTimer.current);
    if (dialogueTimer.current) window.clearTimeout(dialogueTimer.current);
  }, []);

  const showDialogue = (message: string) => {
    setDialogueOverride(message);
    if (dialogueTimer.current) window.clearTimeout(dialogueTimer.current);
    dialogueTimer.current = window.setTimeout(() => setDialogueOverride(""), 4600);
  };

  const animate = (action: PetLastAction) => {
    setMotion(action);
    setMotionKey((value) => value + 1);
    if (motionTimer.current) window.clearTimeout(motionTimer.current);
    const duration = action === "bathe" ? 1500 : action === "feed" ? 1400 : action === "play" ? 1300 : action === "purchase" ? 1100 : 820;
    motionTimer.current = window.setTimeout(() => setMotion("idle"), duration);
  };

  const buyItem = async (itemId: PetItemId) => {
    const item = petItemDefinitions.find((candidate) => candidate.id === itemId)!;
    preparePetSound();
    setBusy(`buy-${itemId}`);
    try {
      if (cloud.enabled) await cloud.purchasePetItem(itemId);
      else {
        const next = purchasePetItem(state, itemId);
        if (!next) throw new Error(item.kind === "toy" && pet.ownedToys.includes(itemId) ? "already owned" : "insufficient points");
        setState(next);
      }
      const line = choosePetLine(petPurchaseLines);
      playPetSound("purchase");
      animate("purchase");
      showDialogue(line);
      speak(line);
      onToast(`${item.name}已购买，花费${item.price}积分。`);
    } catch (error) {
      const message = petOperationError(error);
      showDialogue(message);
      speak(message);
      onToast(message);
    } finally {
      setBusy("");
    }
  };

  const interact = async (hotspot: PetSceneHotspotDefinition) => {
    const line = choosePetLine(petSceneLines[hotspot.id]);
    preparePetSound();
    setBusy(`${hotspot.action}-${hotspot.itemId}`);
    try {
      if (cloud.enabled) await cloud.interactPet(hotspot.action, hotspot.itemId);
      else {
        const next = interactWithPet(state, hotspot.action, hotspot.itemId);
        if (!next) throw new Error("pet item unavailable");
        setState(next);
      }
      playPetSound(hotspot.action);
      animate(hotspot.action);
      showDialogue(line);
      speak(line);
      onToast(line);
    } catch (error) {
      const message = petOperationError(error);
      showDialogue(message);
      speak(message);
      onToast(message);
    } finally {
      setBusy("");
    }
  };

  const statuses = [
    { label: "饱腹度", value: pet.satiety, className: "satiety", icon: <Utensils size={18} /> },
    { label: "开心度", value: pet.happiness, className: "happiness", icon: <Heart size={18} /> },
    { label: "清洁度", value: pet.cleanliness, className: "cleanliness", icon: <Droplets size={18} /> },
  ];

  return (
    <section className="pet-page">
      <header className="pet-page-heading">
        <div><p className="eyebrow">今日营业中</p><h2>{pet.name}的小屋</h2><p>点一点鸟架上的东西，看看嘟嘟会做什么。</p></div>
        <div className="pet-balance"><Star size={21} /><span>可用积分</span><strong>{state.points}</strong></div>
      </header>

      <section className="pet-habitat" aria-label="嘟嘟的互动空间">
        <PetScene pet={pet} speech={dialogueOverride || pet.lastMessage} motion={motion} motionKey={motionKey} busy={busy} onInteract={(hotspot) => void interact(hotspot)} />
        <div className="pet-status-strip" aria-label="嘟嘟的实时状态">
          {statuses.map((status) => <div className={`pet-status-chip ${status.className}`} key={status.label}><div><span>{status.icon}{status.label}</span><strong>{status.value}</strong></div><div className="pet-status-track" role="progressbar" aria-label={status.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.value}><span style={{ width: `${status.value}%` }} /></div></div>)}
        </div>
      </section>

      <section className="pet-inventory-section">
        <div className="pet-section-heading"><div><p className="eyebrow">嘟嘟的储物架</p><h3><Package size={21} /> 用品库存</h3></div><span>{petItemDefinitions.reduce((total, item) => total + (item.kind === "toy" ? Number(pet.ownedToys.includes(item.id)) : itemCount(item.id)), 0)} 件用品</span></div>
        <div className="pet-inventory-grid">
          {petItemDefinitions.map((item) => <article className="pet-inventory-item" key={item.id}><span className={`pet-item-icon pet-item-${item.kind}`}><PetSupplyIcon itemId={item.id} size={24} /></span><div><strong>{item.name}</strong><small>{item.kind === "toy" ? pet.ownedToys.includes(item.id) ? "已永久拥有" : "尚未拥有" : `${itemCount(item.id)} 份`}</small></div></article>)}
        </div>
      </section>

      <section className="pet-store-section">
        <div className="pet-section-heading"><div><p className="eyebrow">积分即时购买</p><h3><ShoppingBag size={21} /> 宠物用品店</h3></div><span>余额 {state.points} 积分</span></div>
        <div className="pet-store-grid">
          {petItemDefinitions.map((item) => {
            const owned = item.kind === "toy" && pet.ownedToys.includes(item.id);
            const disabled = Boolean(busy) || owned || state.points < item.price;
            return <article className="pet-product" key={item.id}><span className={`pet-product-icon pet-item-${item.kind}`}><PetSupplyIcon itemId={item.id} size={30} /></span><div className="pet-product-copy"><div><h3>{item.name}</h3><strong><Star size={16} />{item.price}</strong></div><p>{item.description}</p></div><button className={owned ? "secondary pet-buy-button" : "primary pet-buy-button"} disabled={disabled} onClick={() => void buyItem(item.id)}>{owned ? <><CheckCircle2 size={18} />已拥有</> : busy === `buy-${item.id}` ? "正在购买……" : state.points < item.price ? `还差${item.price - state.points}积分` : <><ShoppingBag size={18} />购买</>}</button></article>;
          })}
        </div>
      </section>
    </section>
  );
}

function PetScene({ pet, speech, motion, motionKey, busy, onInteract }: { pet: PetState; speech: string; motion: PetLastAction; motionKey: number; busy: string; onInteract: (hotspot: PetSceneHotspotDefinition) => void }) {
  return <div className="pet-scene">
    <div className="pet-speech" aria-live="polite" aria-atomic="true"><Bird size={22} /><p>{speech}</p></div>
    <figure className="pet-scene-figure">
      <div className="pet-photo" role="img" aria-label={`${pet.name}站在鸟架上`}>
        <img key={`${motion}-${motionKey}`} className={`pet-character pet-motion-${motion}`} src="pets/sun-conure-cutout-v4.webp" alt="" />
        <PetFeedback motion={motion} motionKey={motionKey} />
        <PetActionEffects motion={motion} motionKey={motionKey} />
        <img className="pet-perch-foreground" src="pets/sun-conure-perch-front-v2.png" alt="" />
        <div className="pet-hotspots" aria-label="鸟架互动热点">
          {petSceneHotspots.map((hotspot) => {
            const available = petHotspotIsAvailable(pet, hotspot.itemId);
            const isBusy = busy === `${hotspot.action}-${hotspot.itemId}`;
            const count = hotspot.itemId === "bell-toy" ? (available ? "已拥有" : "未购买") : `${pet.inventory[hotspot.itemId] ?? 0}份`;
            return <button className={`pet-hotspot pet-hotspot-${hotspot.className}${available ? "" : " is-empty"}${isBusy ? " is-busy" : ""}`} type="button" disabled={Boolean(busy) || !available} title={available ? `${hotspot.label}：${count}` : hotspot.emptyMessage} aria-label={`${hotspot.label}，${available ? count : hotspot.emptyMessage}`} key={hotspot.id} onClick={() => onInteract(hotspot)}><span className="pet-hotspot-icon"><PetSupplyIcon itemId={hotspot.itemId} size={22} /></span><span className="pet-hotspot-copy"><strong>{hotspot.label}</strong><small>{isBusy ? "嘟嘟准备中" : available ? count : hotspot.emptyMessage}</small></span></button>;
          })}
        </div>
      </div>
      <figcaption><strong>{pet.name}</strong><small>{petStatusTitle(pet.satiety, pet.happiness, pet.cleanliness)}</small></figcaption>
    </figure>
  </div>;
}

function PetFeedback({ motion, motionKey }: { motion: PetLastAction; motionKey: number }) {
  if (motion === "feed") return <div className="pet-feedback pet-feedback-feed" key={motionKey} aria-hidden="true"><span><Utensils size={17} /></span><span>✦</span><span>•</span></div>;
  if (motion === "play") return <div className="pet-feedback pet-feedback-play" key={motionKey} aria-hidden="true"><span><Bell size={17} /></span><span>♪</span><span>♡</span></div>;
  if (motion === "bathe") return <div className="pet-feedback pet-feedback-bathe" key={motionKey} aria-hidden="true"><span><Droplets size={18} /></span><span>•</span><span>✦</span></div>;
  if (motion === "purchase") return <div className="pet-feedback pet-feedback-purchase" key={motionKey} aria-hidden="true"><span><Star size={17} /></span><span>✦</span><span>✦</span></div>;
  return null;
}

function PetActionEffects({ motion, motionKey }: { motion: PetLastAction; motionKey: number }) {
  if (motion === "feed") return <div className="pet-action-effects pet-action-effects-feed" key={motionKey} aria-hidden="true"><span className="pet-feed-pellet pellet-one" /><span className="pet-feed-pellet pellet-two" /><span className="pet-feed-pellet pellet-three" /></div>;
  if (motion === "play") return <div className="pet-action-effects pet-action-effects-play" key={motionKey} aria-hidden="true"><span className="pet-effect-bell"><Bell size={26} /></span><span className="pet-music-note note-one">♪</span><span className="pet-music-note note-two">♫</span></div>;
  if (motion === "bathe") return <div className="pet-action-effects pet-action-effects-bathe" key={motionKey} aria-hidden="true"><span className="pet-water-drop drop-one" /><span className="pet-water-drop drop-two" /><span className="pet-water-drop drop-three" /><span className="pet-water-ring" /></div>;
  if (motion === "purchase") return <div className="pet-action-effects pet-action-effects-purchase" key={motionKey} aria-hidden="true"><span className="pet-coin coin-one" /><span className="pet-coin coin-two" /><span className="pet-coin coin-three" /></div>;
  return null;
}

function PetSupplyIcon({ itemId, size }: { itemId: PetItemId; size: number }) {
  if (itemId === "apple-bites") return <Apple size={size} />;
  if (itemId === "bell-toy") return <Bell size={size} />;
  if (itemId === "bath-spray") return <SprayCan size={size} />;
  return <Utensils size={size} />;
}

function petStatusTitle(satiety: number, happiness: number, cleanliness: number) {
  const lowest = Math.min(satiety, happiness, cleanliness);
  if (lowest >= 80) return "羽冠一抬，状态满格";
  if (lowest >= 55) return "精神不错，等你来玩";
  if (lowest === satiety) return "正在认真暗示开饭";
  if (lowest === cleanliness) return "申请一次羽毛水疗";
  return "需要一点热闹和掌声";
}

function petOperationError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : String(error);
  if (/insufficient points/i.test(message)) return "积分不够，嘟嘟建议先完成一项学习任务。";
  if (/already owned/i.test(message)) return "叮当铃已经在嘟嘟的玩具架上了。";
  if (/unavailable|not owned/i.test(message)) return "道具还没准备好，嘟嘟正在用眼神提醒你去商店。";
  if (/network|fetch|联网|offline/i.test(message)) return "这次操作需要联网，连接恢复后再试一次。";
  return "嘟嘟刚才走神了，操作没有完成，请再试一次。";
}

function ShopPage({ state, setState, streak, requiredTaskIds, parentSession, setParentSession, onVictory, cloud }: { state: WorkspaceState; setState: (state: WorkspaceState) => void; streak: number; requiredTaskIds: string[]; parentSession: { dateKey: string; pin: string } | null; setParentSession: (session: { dateKey: string; pin: string } | null) => void; onVictory: () => void; cloud: CloudWorkspaceController }) {
  const [shopTab, setShopTab] = useState<"rewards" | "records" | "parent">("rewards");
  const [pin, setPin] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [message, setMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(state.dateKey.slice(0, 7));
  const [reportPeriod, setReportPeriod] = useState<"day" | "week" | "month">("day");
  const [generatedPairCode, setGeneratedPairCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [generatedParentPairCode, setGeneratedParentPairCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const cloudParent = cloud.enabled && cloud.role === "parent";
  const reportDate = dateFromKey(state.dateKey);
  const parentUnlocked = cloud.enabled ? cloudParent : true;
  const parentPin = dailyParentPin(reportDate);
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

  const applyReward = async (reward: (typeof shopRewards)[number]) => {
    if (cloud.enabled) {
      try {
        await cloud.requestReward(reward.id);
        setMessage("兑换申请已同步，请家长确认。 ");
      } catch (rewardError) {
        setMessage(rewardError instanceof Error ? rewardError.message : "兑换申请失败。");
      }
      return;
    }
    const next = requestReward(state, { id: reward.id, name: reward.name, cost: reward.costStars });
    if (!next) setMessage(weekend ? "积分不足，或已经有同类申请等待处理。" : "周六、周日开放集中兑换。");
    else { setState(next); setMessage("兑换申请已提交，请家长确认。 "); }
  };
  const approve = async (requestId: string) => {
    if (cloud.enabled) {
      try { await cloud.approveReward(requestId); setMessage("兑换已经批准，积分已同步扣除。 "); }
      catch (approvalError) { setMessage(approvalError instanceof Error ? approvalError.message : "兑换审批失败。"); }
      return;
    }
    const next = approveReward(state, requestId, parentPin);
    if (!next) setMessage("家长口令不正确，或当前积分不足。");
    else { setState(next); setMessage("家长已批准，积分已扣除。 "); }
  };
  const fulfill = async (requestId: string) => {
    if (cloud.enabled) {
      try { await cloud.fulfillReward(requestId); setMessage("奖励已经兑现并同步记录。 "); }
      catch (fulfillError) { setMessage(fulfillError instanceof Error ? fulfillError.message : "兑现记录失败。"); }
      return;
    }
    const next = fulfillReward(state, requestId, parentPin);
    if (!next) setMessage("请输入正确的家长口令。");
    else { setState(next); setMessage("奖励已经兑现并记录。 "); }
  };
  const cancelExchange = async (requestId: string) => {
    if (cloud.enabled) {
      try { await cloud.cancelReward(requestId); setMessage("兑换申请已撤销，可以重新选择奖励。 "); }
      catch (cancelError) { setMessage(cancelError instanceof Error ? cancelError.message : "撤销申请失败。"); }
      return;
    }
    const next = cancelReward(state, requestId);
    if (!next) setMessage("只有待批准的申请可以撤销。");
    else { setState(next); setMessage("兑换申请已撤销，可以重新选择奖励。 "); }
  };
  const rejectExchange = async (requestId: string) => {
    if (cloud.enabled) {
      try { await cloud.rejectReward(requestId); setMessage("兑换申请已驳回，孩子可以重新申请。 "); }
      catch (rejectError) { setMessage(rejectError instanceof Error ? rejectError.message : "驳回申请失败。"); }
      return;
    }
    const next = rejectReward(state, requestId, parentPin);
    if (!next) setMessage("只有待批准的申请可以驳回，请确认家长口令。");
    else { setState(next); setMessage("兑换申请已驳回，孩子可以重新申请。 "); }
  };
  const unlockParent = () => {
    if (!verifyParentPin(state, pin, reportDate)) {
      setMessage("口令不正确，请家长再试一次。");
      return;
    }
    setParentSession({ dateKey: state.dateKey, pin });
    setMessage("家长中心已解锁。");
  };
  const approveLearning = async (reviewId: string) => {
    if (cloud.enabled) {
      try { await cloud.reviewTask(reviewId, "approve"); setMessage("学习打卡已批准，积分已经同步。 "); }
      catch (reviewError) { setMessage(reviewError instanceof Error ? reviewError.message : "学习审核失败。"); }
      return;
    }
    const next = approveTaskReview(state, reviewId, requiredTaskIds, parentPin);
    if (!next) setMessage("审核失败，请重新验证家长口令。");
    else {
      const earned = next.points - state.points;
      setState(next);
      setMessage(`已批准学习打卡，发放${earned}积分。`);
      if (!state.bonusAwarded && next.bonusAwarded) onVictory();
    }
  };
  const approveAllLearning = async () => {
    if (cloud.enabled) {
      try { await cloud.reviewAll(); setMessage("今日待审任务已全部批准，积分已经同步。 "); }
      catch (reviewError) { setMessage(reviewError instanceof Error ? reviewError.message : "批量审核失败。"); }
      return;
    }
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
  const rejectLearning = async (reviewId: string) => {
    if (cloud.enabled) {
      try { await cloud.reviewTask(reviewId, "reject"); setMessage("任务已退回，孩子可以重新完成。 "); }
      catch (reviewError) { setMessage(reviewError instanceof Error ? reviewError.message : "退回任务失败。"); }
      return;
    }
    const next = rejectTaskReview(state, reviewId, parentPin);
    if (!next) setMessage("退回失败，请重新验证家长口令。");
    else { setState(next); setMessage("已退回任务，孩子可以重新完成后再提交。 "); }
  };
  const applyAdjustment = async () => {
    if (cloud.enabled) {
      try { await cloud.adjustPoints(Number(adjustment)); setAdjustment(""); setMessage("积分调整已同步。 "); }
      catch (adjustmentError) { setMessage(adjustmentError instanceof Error ? adjustmentError.message : "积分调整失败。"); }
      return;
    }
    const next = adjustPoints(state, Number(adjustment), parentPin);
    if (!next) setMessage("请输入正确口令和非零整数积分。");
    else { setState(next); setAdjustment(""); setMessage("积分调整完成。 "); }
  };
  const lockParent = () => {
    if (cloud.enabled) {
      setShopTab("rewards");
      return;
    }
    setParentSession(null);
    setPin("");
  };

  const generatePairCode = async () => {
    try {
      const code = await cloud.createPairCode();
      setGeneratedPairCode(code);
      setMessage("新的设备配对码已生成，十分钟内有效。 ");
    } catch (pairError) {
      setMessage(pairError instanceof Error ? pairError.message : "配对码生成失败。");
    }
  };

  const generateParentPairCode = async () => {
    try {
      const code = await cloud.createParentPairCode();
      setGeneratedParentPairCode(code);
      setMessage("家长设备配对码已生成，十分钟内有效。请在桌面 PWA 中输入。 ");
    } catch (pairError) {
      setMessage(pairError instanceof Error ? pairError.message : "家长配对码生成失败。");
    }
  };

  const revokeDevice = async (userId: string) => {
    try {
      await cloud.revokeDevice(userId);
      setMessage("孩子设备已移除。 ");
    } catch (deviceError) {
      setMessage(deviceError instanceof Error ? deviceError.message : "设备移除失败。");
    }
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
        {!cloud.enabled || cloudParent ? <button className={shopTab === "parent" ? "active" : ""} role="tab" aria-selected={shopTab === "parent"} onClick={() => setShopTab("parent")}>家长中心</button> : null}
      </div>

      {message ? <p className="shop-message">{message}</p> : null}

      {shopTab === "rewards" ? (
        <div className="reward-grid">
          {rewards.map((reward) => {
            const activeRequest = state.rewardRequests.some((request) => request.rewardId === reward.id && (request.status === "pending" || request.status === "approved"));
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
          <section className="record-section"><h3>兑换记录</h3><div className="request-list">{state.rewardRequests.length ? state.rewardRequests.map((request) => <div className="request-row" key={request.id}><div><strong>{request.rewardName}</strong><p>{formatDate(request.requestedAt.slice(0, 10))} · {request.cost}积分</p></div><div className="request-actions"><span className={`status-chip ${request.status}`}>{rewardStatusLabel(request.status)}</span>{request.status === "pending" && (!cloud.enabled || cloud.role === "child_device") ? <button className="secondary compact-button" onClick={() => void cancelExchange(request.id)}>撤销申请</button> : null}</div></div>) : <div className="empty-record"><img src={characterImages["my-melody"]} alt="" /><p>还没有兑换记录，先完成今天的小目标吧。</p></div>}</div></section>
          <section className="record-section"><h3><Trophy size={20} /> 坚持勋章</h3><div className="badge-row">{[7, 14, 30].map((days) => <span className={badges.includes(days) ? "badge unlocked" : "badge"} key={days}>{days}天</span>)}</div><p>{badges.length ? `已解锁${badges.join("天、")}天坚持勋章。` : `还差${Math.max(0, 7 - streak)}天解锁第一枚勋章。`}</p></section>
        </div>
      ) : null}

      {shopTab === "parent" ? (
        <div className="parent-center">
          {!parentUnlocked ? <section className="parent-gate"><LockKeyhole size={30} /><div><h3>家长验证</h3><p>请输入今日四位家长口令，验证后即可审核学习、处理兑换和调整积分。</p><div className="parent-unlock-row"><input className="pin-input" aria-label="家长口令" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="今日四位口令" /><button className="primary" disabled={pin.length !== 4} onClick={unlockParent}>进入家长中心</button></div></div></section> : <>
            <section className="parent-section learning-review-section">
              <div className="parent-section-head"><div><p className="eyebrow">批准后才会发放对应积分</p><h3>今日学习审核 · {state.pendingTaskReviews.length}项待审</h3></div><div className="inline-actions"><button className="primary" disabled={!state.pendingTaskReviews.length} onClick={() => void approveAllLearning()}>一键批准全部</button><button className="secondary" onClick={lockParent}>{cloud.enabled ? "返回奖励货架" : "退出家长中心"}</button>{cloud.enabled && cloudParent ? <button className="secondary" onClick={() => void cloud.signOut()}><LogOut size={17} />退出云端账号</button> : null}</div></div>
              <div className="learning-review-list">{state.pendingTaskReviews.length ? state.pendingTaskReviews.map((review) => <div className="learning-review-row" key={review.id}><div><strong>{review.taskTitle}</strong><p>{formatTaskReviewEvidence(review)} · 提交于{new Date(review.submittedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p><span>批准后 +{review.points}积分</span></div><div className="review-actions"><button className="secondary" onClick={() => rejectLearning(review.id)}>退回重做</button><button className="primary" onClick={() => approveLearning(review.id)}>批准 +{review.points}</button></div></div>) : <div className="empty-record"><img src={characterImages.cinnamoroll} alt="" /><p>今天没有待审核任务。自动判分题达标后会直接发积分。</p></div>}</div>
            </section>
            <section className="parent-section"><h3>兑换审批</h3><div className="request-list">{state.rewardRequests.filter((request) => request.status === "pending" || request.status === "approved").length ? state.rewardRequests.filter((request) => request.status === "pending" || request.status === "approved").map((request) => <div className="request-row" key={request.id}><span><strong>{request.rewardName}</strong> · {request.cost}积分 · {request.status === "pending" ? "待批准" : "待兑现"}</span>{request.status === "pending" ? <div className="review-actions"><button className="secondary" onClick={() => void rejectExchange(request.id)}>驳回</button><button className="primary" onClick={() => void approve(request.id)}>批准兑换</button></div> : <button className="secondary" onClick={() => void fulfill(request.id)}>确认已兑现</button>}</div>) : <p className="muted">暂无待处理申请。</p>}</div></section>
            <div className="parent-dashboard">
              <section className="parent-section learning-report"><div className="report-heading"><h3><BarChart3 size={20} /> 学习报告总结</h3><div className="report-switch" role="tablist" aria-label="学习报告周期"><button className={reportPeriod === "day" ? "active" : ""} role="tab" aria-selected={reportPeriod === "day"} onClick={() => setReportPeriod("day")}>本日</button><button className={reportPeriod === "week" ? "active" : ""} role="tab" aria-selected={reportPeriod === "week"} onClick={() => setReportPeriod("week")}>本周</button><button className={reportPeriod === "month" ? "active" : ""} role="tab" aria-selected={reportPeriod === "month"} onClick={() => setReportPeriod("month")}>本月</button></div></div><div className="report-metrics"><div><span>完成任务</span><strong>{report.taskCount}项</strong></div><div><span>完整打卡</span><strong>{report.completedDays}天</strong></div><div><span>口算正确率</span><strong>{report.arithmeticAverage ? `${report.arithmeticAverage}%` : "暂无"}</strong></div><div><span>获得积分</span><strong>{report.earnedPoints}</strong></div></div><p className="report-summary">{getLearningReportSummary(reportPeriod, report)}</p><p className="report-wrong">主要错题：{report.wrongQuestions.length ? report.wrongQuestions.slice(0, 5).join("、") : "暂无记录"}</p></section>
              <section className="parent-section"><h3>调整积分</h3><p>用于家长补发奖励或修正记录，负数会扣减但不会低于0。</p><input value={adjustment} onChange={(event) => setAdjustment(event.target.value.replace(/[^\d-]/g, ""))} placeholder="例如 10 或 -5" /><button className="secondary" onClick={applyAdjustment}>确认调整</button></section>
            </div>
            {cloud.enabled && cloudParent ? <section className="parent-section device-management"><div className="parent-section-head"><div><p className="eyebrow">家长设备无需邮箱登录</p><h3><LockKeyhole size={20} /> 快速登录码</h3></div><button className="primary" onClick={() => void generateParentPairCode()}>生成家长码</button></div>{generatedParentPairCode ? <div className="pair-code-result"><strong>{generatedParentPairCode.code}</strong><span>十分钟内有效 · 仅使用一次</span></div> : null}<div className="parent-section-head"><div><p className="eyebrow">孩子设备只可学习和提交</p><h3><Smartphone size={20} /> 设备管理</h3></div><button className="secondary" onClick={() => void generatePairCode()}>生成孩子码</button></div>{generatedPairCode ? <div className="pair-code-result"><strong>{generatedPairCode.code}</strong><span>十分钟内有效</span></div> : null}<div className="device-list">{cloud.devices.length ? cloud.devices.map((device) => <div className="device-row" key={device.userId}><div><strong>{device.name}</strong><span>{new Date(device.createdAt).toLocaleDateString("zh-CN")}</span></div><button className="secondary" onClick={() => void revokeDevice(device.userId)}>移除</button></div>) : <p className="muted">还没有配对孩子设备。</p>}</div></section> : null}
          </>}
        </div>
      ) : null}
    </section>
  );
}

function rewardStatusLabel(status: WorkspaceState["rewardRequests"][number]["status"]) {
  if (status === "pending") return "待家长批准";
  if (status === "approved") return "待兑现";
  if (status === "fulfilled") return "已兑现";
  if (status === "cancelled") return "已撤销";
  return "已驳回";
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
  return `已经完成${report.taskCount}项任务，每一次认真完成都值得记录。`;
}
