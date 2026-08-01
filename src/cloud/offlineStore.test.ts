import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { initialWorkspaceState } from "../state/workspace";
import { clearCloudUserData, enqueueTaskCommand, readCloudSnapshot, readTaskOutbox, removeTaskCommand, saveCloudSnapshot } from "./offlineStore";
import type { CloudWorkspacePayload, QueuedTaskCommand } from "./types";

describe("cloud offline store", () => {
  it("stores a canonical workspace snapshot per signed-in user", async () => {
    const userId = crypto.randomUUID();
    const payload: CloudWorkspacePayload = {
      state: initialWorkspaceState(new Date("2026-08-01T04:00:00.000Z")),
      role: "parent",
      familyId: crypto.randomUUID(),
      childId: crypto.randomUUID(),
      legacyImported: true,
      devices: [],
    };

    await saveCloudSnapshot(userId, payload);

    await expect(readCloudSnapshot(userId)).resolves.toEqual(payload);
  });

  it("keeps task commands in creation order until each one is acknowledged", async () => {
    const userId = crypto.randomUUID();
    const later: QueuedTaskCommand = {
      commandId: crypto.randomUUID(),
      userId,
      type: "submit_task",
      dateKey: "2026-08-01",
      taskId: "english-daily",
      result: { durationSeconds: 900 },
      createdAt: "2026-08-01T02:00:00.000Z",
    };
    const earlier: QueuedTaskCommand = {
      commandId: crypto.randomUUID(),
      userId,
      type: "submit_task",
      dateKey: "2026-08-01",
      taskId: "math-arithmetic",
      result: { score: 90 },
      createdAt: "2026-08-01T01:00:00.000Z",
    };

    await enqueueTaskCommand(later);
    await enqueueTaskCommand(earlier);
    expect((await readTaskOutbox(userId)).map((command) => command.commandId)).toEqual([earlier.commandId, later.commandId]);

    await removeTaskCommand(earlier.commandId);
    expect((await readTaskOutbox(userId)).map((command) => command.commandId)).toEqual([later.commandId]);
  });

  it("removes a revoked device snapshot and only that device's queued commands", async () => {
    const revokedUserId = crypto.randomUUID();
    const otherUserId = crypto.randomUUID();
    const payload: CloudWorkspacePayload = {
      state: initialWorkspaceState(new Date("2026-08-01T04:00:00.000Z")),
      role: "child_device",
      familyId: crypto.randomUUID(),
      childId: crypto.randomUUID(),
      legacyImported: true,
      devices: [],
    };
    const commandFor = (userId: string): QueuedTaskCommand => ({
      commandId: crypto.randomUUID(),
      userId,
      type: "submit_task",
      dateKey: "2026-08-01",
      taskId: "math-arithmetic",
      result: { score: 90 },
      createdAt: new Date().toISOString(),
    });

    await saveCloudSnapshot(revokedUserId, payload);
    await saveCloudSnapshot(otherUserId, payload);
    await enqueueTaskCommand(commandFor(revokedUserId));
    await enqueueTaskCommand(commandFor(otherUserId));
    await clearCloudUserData(revokedUserId);

    await expect(readCloudSnapshot(revokedUserId)).resolves.toBeUndefined();
    await expect(readTaskOutbox(revokedUserId)).resolves.toEqual([]);
    await expect(readCloudSnapshot(otherUserId)).resolves.toEqual(payload);
    expect(await readTaskOutbox(otherUserId)).toHaveLength(1);
  });
});
