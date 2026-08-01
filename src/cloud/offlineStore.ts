import { openDB } from "idb";
import type { CloudWorkspacePayload, QueuedTaskCommand } from "./types";

const DATABASE_NAME = "sweetheart-workspace-cloud-v1";
const SNAPSHOTS = "snapshots";
const OUTBOX = "outbox";

const database = () => openDB(DATABASE_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(SNAPSHOTS);
    const outbox = db.createObjectStore(OUTBOX, { keyPath: "commandId" });
    outbox.createIndex("userId", "userId");
  },
});

export const readCloudSnapshot = async (userId: string) => (await database()).get(SNAPSHOTS, userId) as Promise<CloudWorkspacePayload | undefined>;

export const saveCloudSnapshot = async (userId: string, payload: CloudWorkspacePayload) => {
  await (await database()).put(SNAPSHOTS, payload, userId);
};

export const enqueueTaskCommand = async (command: QueuedTaskCommand) => {
  await (await database()).put(OUTBOX, command);
};

export const readTaskOutbox = async (userId: string) => {
  const commands = await (await database()).getAllFromIndex(OUTBOX, "userId", userId) as QueuedTaskCommand[];
  return commands.sort((first, second) => first.createdAt.localeCompare(second.createdAt));
};

export const removeTaskCommand = async (commandId: string) => {
  await (await database()).delete(OUTBOX, commandId);
};

export const clearCloudUserData = async (userId: string) => {
  const db = await database();
  const transaction = db.transaction([SNAPSHOTS, OUTBOX], "readwrite");
  await transaction.objectStore(SNAPSHOTS).delete(userId);
  const commands = await transaction.objectStore(OUTBOX).index("userId").getAllKeys(userId);
  await Promise.all(commands.map((key) => transaction.objectStore(OUTBOX).delete(key)));
  await transaction.done;
};
