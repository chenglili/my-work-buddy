import type { TaskDefinition } from "../appData";
import type { CompletionResultInput, PetAction, PetItemId, WorkspaceState } from "../state/workspace";

export type CloudRole = "parent" | "child_device";
export type CloudMode = "local" | "loading" | "signed-out" | "pairing" | "migration" | "ready" | "error";
export type SyncStatus = "local" | "synced" | "syncing" | "pending" | "offline";

export interface CloudDevice {
  userId: string;
  name: string;
  createdAt: string;
}

export interface CloudWorkspacePayload {
  state: WorkspaceState;
  role: CloudRole;
  familyId: string;
  childId: string;
  legacyImported: boolean;
  devices: CloudDevice[];
}

export interface LegacyImportPreview {
  points: number;
  completedDays: number;
  taskResults: number;
  pendingReviews: number;
  rewardRequests: number;
  latestDate: string;
}

export interface QueuedTaskCommand {
  commandId: string;
  userId: string;
  type: "submit_task";
  dateKey: string;
  taskId: string;
  contentRound?: number;
  result: CompletionResultInput;
  createdAt: string;
}

export interface CloudWorkspaceController {
  enabled: boolean;
  mode: CloudMode;
  state: WorkspaceState;
  role: CloudRole | null;
  devices: CloudDevice[];
  pendingTaskIds: string[];
  syncStatus: SyncStatus;
  error: string;
  authMessage: string;
  userEmail: string;
  legacyPreview: LegacyImportPreview | null;
  setLocalState: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  loginParent(email: string): Promise<void>;
  pairParent(code: string, deviceName: string): Promise<void>;
  pairChild(code: string, deviceName: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
  refreshLocalDate(): void;
  startContentRound(contentDateKey: string): Promise<void>;
  resetTodayGameCompletions(): Promise<void>;
  confirmLegacyImport(): Promise<void>;
  submitTask(task: TaskDefinition, result: CompletionResultInput): Promise<"synced" | "queued">;
  reviewTask(reviewId: string, action: "approve" | "reject"): Promise<void>;
  reviewAll(): Promise<void>;
  requestReward(rewardId: string): Promise<void>;
  cancelReward(requestId: string): Promise<void>;
  approveReward(requestId: string): Promise<void>;
  rejectReward(requestId: string): Promise<void>;
  fulfillReward(requestId: string): Promise<void>;
  adjustPoints(amount: number): Promise<void>;
  backfillRecentCheckins(startDateKey: string, endDateKey: string, removeDateKey?: string): Promise<void>;
  purchasePetItem(itemId: PetItemId): Promise<void>;
  interactPet(action: PetAction, itemId: PetItemId): Promise<void>;
  createPairCode(): Promise<{ code: string; expiresAt: string }>;
  createParentPairCode(): Promise<{ code: string; expiresAt: string }>;
  revokeDevice(userId: string): Promise<void>;
}
