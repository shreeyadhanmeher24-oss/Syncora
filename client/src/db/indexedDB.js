
import { openDB } from "idb";

const DB_NAME = "syncora-db";
const DB_VERSION = 2;

const TASK_STORE = "tasks";
const OPERATION_STORE = "syncOperations";

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Preserve the existing tasks store.
    if (!db.objectStoreNames.contains(TASK_STORE)) {
      db.createObjectStore(TASK_STORE, {
        keyPath: "id",
      });
    }

    // Store changes that still need to sync.
    if (!db.objectStoreNames.contains(OPERATION_STORE)) {
      const operationStore = db.createObjectStore(
        OPERATION_STORE,
        {
          keyPath: "operationId",
        }
      );

      operationStore.createIndex("status", "status");
      operationStore.createIndex("createdAt", "createdAt");
    }
  },
});

// ------------------------------
// TASK FUNCTIONS
// ------------------------------

export async function getAllTasks() {
  const db = await dbPromise;
  return db.getAll(TASK_STORE);
}

export async function saveTask(task) {
  const db = await dbPromise;
  await db.put(TASK_STORE, task);
}

export async function deleteTask(id) {
  const db = await dbPromise;
  await db.delete(TASK_STORE, id);
}

// ------------------------------
// OFFLINE OPERATION QUEUE
// ------------------------------

export async function enqueueOperation({
  type,
  taskId,
  payload = null,
}) {
  const db = await dbPromise;

  const operation = {
    operationId: crypto.randomUUID(),
    type,
    taskId,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
    lastError: null,
  };

  await db.add(OPERATION_STORE, operation);

  return operation;
}

export async function getPendingOperations() {
  const db = await dbPromise;

  return db.getAllFromIndex(
    OPERATION_STORE,
    "status",
    "pending"
  );
}

export async function getAllOperations() {
  const db = await dbPromise;
  return db.getAll(OPERATION_STORE);
}

export async function markOperationSynced(operationId) {
  const db = await dbPromise;
  const tx = db.transaction(OPERATION_STORE, "readwrite");

  const store = tx.objectStore(OPERATION_STORE);
  const operation = await store.get(operationId);

  if (operation) {
    operation.status = "synced";
    operation.syncedAt = new Date().toISOString();

    await store.put(operation);
  }

  await tx.done;
}

export async function recordOperationFailure(
  operationId,
  errorMessage
) {
  const db = await dbPromise;
  const tx = db.transaction(OPERATION_STORE, "readwrite");

  const store = tx.objectStore(OPERATION_STORE);
  const operation = await store.get(operationId);

  if (operation) {
    operation.attempts += 1;
    operation.lastAttemptAt = new Date().toISOString();
    operation.lastError = errorMessage;
  }

  if (operation) {
    await store.put(operation);
  }

  await tx.done;
}
