import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { TaskDefinition } from "../appData";
import {
  initialWorkspaceState,
  normalizeWorkspaceState,
  readStoredState,
  refreshDailyState,
  STORAGE_KEY,
  type CompletionResultInput,
  type PetAction,
  type PetItemId,
  type WorkspaceState,
} from "../state/workspace";
import { authCallbackPresent, cloudBackendEnabled, supabase } from "./supabase";
import { clearCloudUserData, enqueueTaskCommand, readCloudSnapshot, readTaskOutbox, removeTaskCommand, saveCloudSnapshot } from "./offlineStore";
import type { CloudMode, CloudWorkspaceController, CloudWorkspacePayload, LegacyImportPreview, QueuedTaskCommand, SyncStatus } from "./types";

const LEGACY_BACKUP_KEY = "my-work-buddy-state-v2-cloud-backup";

const dateFromKey = (value: string) => new Date(`${value}T12:00:00`);
const commandId = () => crypto.randomUUID();

const readLegacyWorkspace = () => readStoredState();

export const summarizeLegacyWorkspace = (legacy: WorkspaceState): LegacyImportPreview => ({
  points: legacy.points,
  completedDays: legacy.completedDates.length,
  taskResults: legacy.taskResults.length,
  pendingReviews: legacy.pendingTaskReviews.length,
  rewardRequests: legacy.rewardRequests.length,
  latestDate: legacy.dateKey,
});

const cleanResult = (result: CompletionResultInput): CompletionResultInput => ({
  contentRound: result.contentRound ?? 0,
  contentDateKey: result.contentDateKey,
  score: result.score,
  firstScore: result.firstScore,
  durationSeconds: result.durationSeconds ?? 0,
  attempts: result.attempts ?? 1,
  wrongQuestions: result.wrongQuestions ?? [],
  answers: result.answers,
  correctQuestions: result.correctQuestions,
  evidence: result.evidence,
});

const hashText = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "云端操作失败，请稍后再试。";
const isNetworkFailure = (error: unknown) => !navigator.onLine || /fetch|network|offline/i.test(errorMessage(error));
const isMembershipFailure = (error: unknown) => /family membership required/i.test(errorMessage(error));

const normalizePayload = (value: unknown): CloudWorkspacePayload => {
  if (!value || typeof value !== "object") throw new Error("云端返回的数据格式不正确。");
  const payload = value as CloudWorkspacePayload;
  if (!payload.state || !payload.role || !payload.childId) throw new Error("云端工作台数据不完整。");
  return {
    ...payload,
    state: normalizeWorkspaceState(payload.state, dateFromKey(payload.state.dateKey)),
    devices: payload.devices ?? [],
  };
};

export const useCloudWorkspace = (): CloudWorkspaceController => {
  const [state, setState] = useState<WorkspaceState>(() => readStoredState());
  const [mode, setMode] = useState<CloudMode>(cloudBackendEnabled ? "loading" : "local");
  const [payload, setPayload] = useState<CloudWorkspacePayload | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudBackendEnabled ? "syncing" : "local");
  const [error, setError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [legacyPreview, setLegacyPreview] = useState<LegacyImportPreview | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const payloadRef = useRef<CloudWorkspacePayload | null>(null);
  const activeDateKeyRef = useRef(state.dateKey);
  const flushingRef = useRef(false);
  const realtimeRefreshTimer = useRef<number | null>(null);

  const refreshPendingTaskIds = useCallback(async (userId: string) => {
    const commands = await readTaskOutbox(userId);
    setPendingTaskIds(Array.from(new Set(commands.filter((command) => command.dateKey === activeDateKeyRef.current && (command.contentRound ?? command.result.contentRound ?? 0) === stateRef.current.contentRound).map((command) => command.taskId))));
    return commands;
  }, []);

  const applyPayload = useCallback(async (userId: string, raw: unknown) => {
    const next = normalizePayload(raw);
    activeDateKeyRef.current = next.state.dateKey;
    payloadRef.current = next;
    setPayload(next);
    setState(next.state);
    setMode("ready");
    setError("");
    setSyncStatus(navigator.onLine ? "synced" : "offline");
    await saveCloudSnapshot(userId, next);
  }, []);

  const invokeNotification = useCallback(async () => {
    if (!supabase || !navigator.onLine) return;
    await supabase.functions.invoke("daily-ready", { method: "POST", body: {} }).catch(() => undefined);
  }, []);

  const fetchWorkspace = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error: rpcError } = await supabase.rpc("get_workspace");
    if (rpcError) throw rpcError;
    await applyPayload(userId, data);
  }, [applyPayload]);

  const resetChildPairing = useCallback(async (userId: string, wasPaired: boolean) => {
    await clearCloudUserData(userId).catch(() => undefined);
    setPendingTaskIds([]);
    payloadRef.current = null;
    setPayload(null);
    setLegacyPreview(null);
    setState(initialWorkspaceState());
    setMode("pairing");
    setSyncStatus("offline");
    setError(wasPaired ? "这台设备的家庭连接已被移除，请使用新的配对码重新连接。" : "");
  }, []);

  const refreshFromCloud = useCallback(async () => {
    const session = sessionRef.current;
    if (!supabase || !session || !navigator.onLine) return false;
    setSyncStatus("syncing");
    try {
      await fetchWorkspace(session.user.id);
      return true;
    } catch (refreshError) {
      if (session.user.is_anonymous && isMembershipFailure(refreshError)) {
        await resetChildPairing(session.user.id, true);
        return false;
      }
      setSyncStatus("offline");
      setError(`暂时无法同步云端数据：${errorMessage(refreshError)}`);
      return false;
    }
  }, [fetchWorkspace, resetChildPairing]);

  const migrateLegacy = useCallback(async (userId: string, currentPayload: CloudWorkspacePayload) => {
    if (!supabase || currentPayload.legacyImported) return currentPayload;
    const legacyState = readLegacyWorkspace();
    const serialized = JSON.stringify(legacyState);
    localStorage.setItem(LEGACY_BACKUP_KEY, serialized);
    const { data, error: migrationError } = await supabase.rpc("import_legacy_workspace", {
      p_command_id: commandId(),
      p_legacy: legacyState,
      p_import_hash: await hashText(serialized),
    });
    if (migrationError) throw migrationError;
    const migrated = normalizePayload(data);
    setLegacyPreview(null);
    await applyPayload(userId, migrated);
    return migrated;
  }, [applyPayload]);

  const initializeSession = useCallback(async (session: Session) => {
    if (!supabase) return;
    sessionRef.current = session;
    setUserEmail(session.user.email ?? "孩子设备");
    setMode("loading");
    setSyncStatus(navigator.onLine ? "syncing" : "offline");
    const cached = await readCloudSnapshot(session.user.id).catch(() => undefined);
    if (cached) {
      const freshState = refreshDailyState(cached.state);
      const freshCached = freshState === cached.state ? cached : { ...cached, state: freshState };
      activeDateKeyRef.current = freshCached.state.dateKey;
      payloadRef.current = freshCached;
      setPayload(freshCached);
      setState(freshCached.state);
      if (freshState !== cached.state) void saveCloudSnapshot(session.user.id, freshCached);
    }
    const queued = await refreshPendingTaskIds(session.user.id).catch(() => []);

    try {
      if (!session.user.is_anonymous) {
        const { error: familyError } = await supabase.rpc("ensure_parent_family", { p_name: "甜心家庭" });
        if (familyError) throw familyError;
      }
      const { data, error: workspaceError } = await supabase.rpc("get_workspace");
      if (workspaceError) {
        if (session.user.is_anonymous && isMembershipFailure(workspaceError)) {
          await resetChildPairing(session.user.id, Boolean(cached));
          return;
        }
        throw workspaceError;
      }
      const next = normalizePayload(data);
      if (!session.user.is_anonymous && !next.legacyImported) {
        const legacyState = readLegacyWorkspace();
        activeDateKeyRef.current = legacyState.dateKey;
        payloadRef.current = next;
        setPayload(next);
        setState(legacyState);
        setLegacyPreview(summarizeLegacyWorkspace(legacyState));
        setMode("migration");
        setSyncStatus("synced");
        setError("");
        return;
      }
      await applyPayload(session.user.id, next);
      if (queued.length) {
        await refreshPendingTaskIds(session.user.id);
        setSyncStatus(navigator.onLine ? "syncing" : "pending");
      }
      await invokeNotification();
    } catch (sessionError) {
      if (cached) {
        setMode("ready");
        setSyncStatus("offline");
        setError("当前无法连接云端，正在使用上次同步的数据。");
      } else {
        setMode("error");
        setError(errorMessage(sessionError));
      }
    }
  }, [applyPayload, invokeNotification, refreshPendingTaskIds, resetChildPairing]);

  const restoreSession = useCallback(async () => {
    if (!supabase) return false;
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!data.session) return false;
    await initializeSession(data.session);
    return true;
  }, [initializeSession]);

  const syncQueuedCommand = useCallback(async (command: QueuedTaskCommand) => {
    if (!supabase) return;
    const { data, error: rpcError } = await supabase.rpc("submit_task", {
      p_command_id: command.commandId,
      p_date_key: command.dateKey,
      p_task_id: command.taskId,
      p_result: command.result,
      p_completed_at: command.createdAt,
    });
    if (rpcError) throw rpcError;
    await removeTaskCommand(command.commandId);
    await refreshPendingTaskIds(command.userId);
    await applyPayload(command.userId, data);
  }, [applyPayload, refreshPendingTaskIds]);

  const flushOutbox = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !supabase || !navigator.onLine || flushingRef.current) return;
    flushingRef.current = true;
    setSyncStatus("syncing");
    try {
      const commands = await readTaskOutbox(session.user.id);
      for (const queued of commands) {
        try {
          await syncQueuedCommand(queued);
        } catch (syncError) {
          if (isNetworkFailure(syncError)) {
            setSyncStatus("offline");
            return;
          }
          if (session.user.is_anonymous && isMembershipFailure(syncError)) {
            await resetChildPairing(session.user.id, true);
            return;
          }
          await removeTaskCommand(queued.commandId);
          await refreshPendingTaskIds(session.user.id);
          setError(`一项离线记录未能同步：${errorMessage(syncError)}`);
        }
      }
      if (await refreshFromCloud()) await invokeNotification();
    } catch (flushError) {
      setSyncStatus("offline");
      setError(`暂时无法同步离线记录：${errorMessage(flushError)}`);
    } finally {
      flushingRef.current = false;
    }
  }, [invokeNotification, refreshFromCloud, resetChildPairing, syncQueuedCommand]);

  useEffect(() => {
    if (!cloudBackendEnabled || !supabase) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return;
    }
  }, [state]);

  useEffect(() => {
    if (!cloudBackendEnabled || !supabase) return;
    const client = supabase;
    let active = true;
    const authChannel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("sweetheart-auth-session");
    const receiveSession = (event: MessageEvent) => {
      const data = event.data as { type?: string; accessToken?: string; refreshToken?: string };
      if (data?.type !== "supabase-session" || !data.accessToken || !data.refreshToken) return;
      void client.auth.setSession({ access_token: data.accessToken, refresh_token: data.refreshToken }).catch((sessionError) => {
        if (active) setError(errorMessage(sessionError));
      });
    };
    authChannel?.addEventListener("message", receiveSession);
    const shareSession = (session: Session | null) => {
      if (!authCallbackPresent || !session) return;
      authChannel?.postMessage({ type: "supabase-session", accessToken: session.access_token, refreshToken: session.refresh_token });
    };
    void restoreSession().then((restored) => {
      if (restored) shareSession(sessionRef.current);
      if (active && !restored) setMode("signed-out");
    }).catch((sessionError) => {
      if (active) {
        setMode("error");
        setError(errorMessage(sessionError));
      }
    });
    const resumeSession = () => {
      if (document.visibilityState !== "visible" || sessionRef.current) return;
      void restoreSession().catch((sessionError) => {
        if (active) setError(errorMessage(sessionError));
      });
    };
    window.addEventListener("focus", resumeSession);
    window.addEventListener("pageshow", resumeSession);
    document.addEventListener("visibilitychange", resumeSession);
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      sessionRef.current = session;
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        shareSession(session);
        void initializeSession(session);
      }
      else {
        if (session) return;
        const emptyState = initialWorkspaceState();
        payloadRef.current = null;
        activeDateKeyRef.current = emptyState.dateKey;
        setPayload(null);
        setLegacyPreview(null);
        setPendingTaskIds([]);
        setState(emptyState);
        setUserEmail("");
        setAuthMessage("");
        setError("");
        setMode("signed-out");
        setSyncStatus("offline");
      }
    });
    return () => {
      active = false;
      authChannel?.removeEventListener("message", receiveSession);
      authChannel?.close();
      window.removeEventListener("focus", resumeSession);
      window.removeEventListener("pageshow", resumeSession);
      document.removeEventListener("visibilitychange", resumeSession);
      listener.subscription.unsubscribe();
    };
  }, [initializeSession, restoreSession]);

  useEffect(() => {
    if (!cloudBackendEnabled || !supabase || mode !== "ready") return;
    const client = supabase;
    const refreshSoon = () => {
      if (realtimeRefreshTimer.current) window.clearTimeout(realtimeRefreshTimer.current);
      realtimeRefreshTimer.current = window.setTimeout(() => {
        void refreshFromCloud();
      }, 250);
    };
    const channel = client.channel("workspace-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_records" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "point_ledger" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "reward_requests" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "pet_profiles" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_members" }, refreshSoon)
      .subscribe();
    const online = () => void flushOutbox();
    const offline = () => setSyncStatus("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    void flushOutbox();
    return () => {
      if (realtimeRefreshTimer.current) window.clearTimeout(realtimeRefreshTimer.current);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      void client.removeChannel(channel);
    };
  }, [flushOutbox, mode, refreshFromCloud]);

  const loginParent = useCallback(async (email: string) => {
    if (!supabase) return;
    setAuthMessage("");
    if (sessionRef.current?.user.is_anonymous) await supabase.auth.signOut();
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error: signInError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (signInError) throw signInError;
    setAuthMessage("登录邮件已发送，请在邮箱中打开链接。 ");
  }, []);

  const pairDevice = useCallback(async (code: string, deviceName: string, role: "parent" | "child") => {
    if (!supabase) return;
    let session = sessionRef.current;
    if (!session?.user.is_anonymous) {
      if (session) await supabase.auth.signOut();
      const { data, error: anonymousError } = await supabase.auth.signInAnonymously();
      if (anonymousError || !data.session) throw anonymousError ?? new Error("无法创建设备会话。");
      session = data.session;
      sessionRef.current = session;
    }
    const rpcName = role === "parent" ? "claim_parent_pair_code" : "claim_pair_code";
    const { error: pairError } = await supabase.rpc(rpcName, { p_command_id: commandId(), p_code: code, p_device_name: deviceName || (role === "parent" ? "家长设备" : "孩子设备") });
    if (pairError) throw pairError;
    await initializeSession(session);
  }, [initializeSession]);

  const pairParent = useCallback((code: string, deviceName: string) => pairDevice(code, deviceName, "parent"), [pairDevice]);
  const pairChild = useCallback((code: string, deviceName: string) => pairDevice(code, deviceName, "child"), [pairDevice]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    const emptyState = initialWorkspaceState();
    sessionRef.current = null;
    setPayload(null);
    payloadRef.current = null;
    activeDateKeyRef.current = emptyState.dateKey;
    setLegacyPreview(null);
    setPendingTaskIds([]);
    setMode("signed-out");
    setState(emptyState);
    setUserEmail("");
    setAuthMessage("");
    setError("");
  }, []);

  const refresh = useCallback(async () => {
    if (!sessionRef.current && await restoreSession()) return;
    const refreshed = await refreshFromCloud();
    if (!refreshed && !sessionRef.current) setAuthMessage("还没有检测到登录状态，请在同一个浏览器中打开邮件链接。 ");
  }, [refreshFromCloud, restoreSession]);

  const refreshLocalDate = useCallback(() => {
    const currentState = stateRef.current;
    const next = refreshDailyState(currentState);
    if (next === currentState) return;
    activeDateKeyRef.current = next.dateKey;
    stateRef.current = next;
    setState(next);
    const session = sessionRef.current;
    const currentPayload = payloadRef.current;
    if (session && currentPayload) {
      const nextPayload = { ...currentPayload, state: next };
      payloadRef.current = nextPayload;
      setPayload(nextPayload);
      void saveCloudSnapshot(session.user.id, nextPayload);
      void refreshPendingTaskIds(session.user.id);
    }
  }, [refreshPendingTaskIds]);

  const confirmLegacyImport = useCallback(async () => {
    const session = sessionRef.current;
    const currentPayload = payloadRef.current;
    if (!session || session.user.is_anonymous || !currentPayload || currentPayload.legacyImported) throw new Error("当前没有待迁移的家长设备。");
    setMode("loading");
    try {
      await migrateLegacy(session.user.id, currentPayload);
    } catch (migrationError) {
      setMode("migration");
      setError(`迁移未完成：${errorMessage(migrationError)}`);
      throw migrationError;
    }
  }, [migrateLegacy]);

  const submitTask = useCallback(async (task: TaskDefinition, result: CompletionResultInput) => {
    if (!cloudBackendEnabled || !supabase) throw new Error("云端未启用。");
    const session = sessionRef.current;
    if (!session) throw new Error("请先登录或配对设备。");
    const clean = cleanResult(result);
    if (!payload) throw new Error("云端工作台尚未准备完成。");
    const round = clean.contentRound ?? state.contentRound;
    const existing = (await readTaskOutbox(session.user.id)).find((command) => command.dateKey === state.dateKey && command.taskId === task.id && (command.contentRound ?? command.result.contentRound ?? 0) === round);
    if (existing) {
      setPendingTaskIds((current) => current.includes(task.id) ? current : [...current, task.id]);
      setSyncStatus(navigator.onLine ? "syncing" : "pending");
      if (navigator.onLine) void flushOutbox();
      return "queued";
    }
    const queued: QueuedTaskCommand = { commandId: commandId(), userId: session.user.id, type: "submit_task", dateKey: state.dateKey, taskId: task.id, contentRound: round, result: clean, createdAt: new Date().toISOString() };
    await enqueueTaskCommand(queued);
    setPendingTaskIds((current) => current.includes(task.id) ? current : [...current, task.id]);
    if (!navigator.onLine) {
      setSyncStatus("pending");
      return "queued";
    }
    setSyncStatus("syncing");
    try {
      await syncQueuedCommand(queued);
      await invokeNotification();
      setSyncStatus("synced");
      return "synced";
    } catch (submitError) {
      if (isNetworkFailure(submitError)) {
        setSyncStatus("pending");
        return "queued";
      }
      await removeTaskCommand(queued.commandId);
      await refreshPendingTaskIds(session.user.id);
      await refreshFromCloud();
      throw submitError instanceof Error ? submitError : new Error(errorMessage(submitError));
    }
  }, [flushOutbox, invokeNotification, payload, refreshFromCloud, refreshPendingTaskIds, state.contentRound, state.dateKey, syncQueuedCommand]);

  const runMutation = useCallback(async (name: string, args: Record<string, unknown>) => {
    const session = sessionRef.current;
    if (!supabase || !session) throw new Error("请先登录或配对设备。");
    if (!navigator.onLine) throw new Error("此操作需要联网后进行。");
    setSyncStatus("syncing");
    const { data, error: rpcError } = await supabase.rpc(name, { p_command_id: commandId(), ...args });
    if (rpcError) {
      setSyncStatus("synced");
      throw rpcError;
    }
    await applyPayload(session.user.id, data);
    await invokeNotification();
  }, [applyPayload, invokeNotification]);

  const startContentRound = useCallback(async (contentDateKey: string) => {
    await runMutation("start_content_round", { p_content_date_key: contentDateKey });
  }, [runMutation]);

  const createPairCode = useCallback(async () => {
    if (!supabase || payload?.role !== "parent" || !navigator.onLine) throw new Error("请使用联网的家长设备操作。");
    const { data, error: rpcError } = await supabase.rpc("create_pair_code", { p_command_id: commandId(), p_device_name: "孩子设备" });
    if (rpcError) throw rpcError;
    return data as { code: string; expiresAt: string };
  }, [payload?.role]);

  const createParentPairCode = useCallback(async () => {
    if (!supabase || payload?.role !== "parent" || !navigator.onLine) throw new Error("请使用联网的家长设备操作。");
    const { data, error: rpcError } = await supabase.rpc("create_parent_pair_code", { p_command_id: commandId() });
    if (rpcError) throw rpcError;
    return data as { code: string; expiresAt: string };
  }, [payload?.role]);

  const revokeDevice = useCallback(async (userId: string) => {
    if (!supabase || payload?.role !== "parent" || !navigator.onLine) throw new Error("请使用联网的家长设备操作。");
    const { error: rpcError } = await supabase.rpc("revoke_child_device", { p_command_id: commandId(), p_user_id: userId });
    if (rpcError) throw rpcError;
    await refresh();
  }, [payload?.role, refresh]);

  return {
    enabled: cloudBackendEnabled,
    mode,
    state,
    role: payload?.role ?? null,
    devices: payload?.devices ?? [],
    pendingTaskIds,
    syncStatus,
    error,
    authMessage,
    userEmail,
    legacyPreview,
    setLocalState: setState,
    loginParent,
    pairParent,
    pairChild,
    signOut,
    refresh,
    refreshLocalDate,
    startContentRound,
    resetTodayGameCompletions: () => runMutation("reset_today_game_completions", {}),
    confirmLegacyImport,
    submitTask,
    reviewTask: (reviewId, action) => runMutation("review_task", { p_review_id: reviewId, p_action: action }),
    reviewAll: () => runMutation("review_all", {}),
    requestReward: (rewardId) => runMutation("request_reward", { p_reward_id: rewardId }),
    cancelReward: (requestId) => runMutation("cancel_reward", { p_request_id: requestId }),
    approveReward: (requestId) => runMutation("approve_reward", { p_request_id: requestId }),
    rejectReward: (requestId) => runMutation("reject_reward", { p_request_id: requestId }),
    fulfillReward: (requestId) => runMutation("fulfill_reward", { p_request_id: requestId }),
    adjustPoints: (amount) => runMutation("adjust_points", { p_amount: amount }),
    backfillRecentCheckins: async (startDateKey, endDateKey, removeDateKey) => {
      const session = sessionRef.current;
      if (!supabase || !session) throw new Error("璇峰厛鐧诲綍鎴栭厤瀵硅澶囥€?");
      setSyncStatus("syncing");
      const { data, error: rpcError } = await supabase.rpc("correct_recent_checkins", { p_start: startDateKey, p_end: endDateKey, p_remove: removeDateKey ?? null });
      if (rpcError) { setSyncStatus("synced"); throw rpcError; }
      await applyPayload(session.user.id, data);
    },
    purchasePetItem: (itemId: PetItemId) => runMutation("purchase_pet_item", { p_item_id: itemId }),
    interactPet: (action: PetAction, itemId: PetItemId) => runMutation("interact_pet", { p_action: action, p_item_id: itemId }),
    createPairCode,
    createParentPairCode,
    revokeDevice,
  };
};
