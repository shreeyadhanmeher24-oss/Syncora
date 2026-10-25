
import {
  getPendingOperations,
  markOperationSynced,
  recordOperationFailure,
} from "../db/indexedDB";

const API_BASE_URL = "http://localhost:5000/api";

let syncInProgress = false;

export async function syncPendingOperations() {
  if (syncInProgress || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  syncInProgress = true;

  let synced = 0;
  let failed = 0;

  try {
    const operations = await getPendingOperations();

    operations.sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) ||
        a.operationId.localeCompare(b.operationId)
    );

    for (const operation of operations) {
      if (!navigator.onLine) break;

      try {
        const { type, taskId, payload } = operation;
        const id = encodeURIComponent(taskId);

        let response;

        if (type === "CREATE") {
          response = await fetch(`${API_BASE_URL}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else if (type === "UPDATE") {
          response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else if (type === "DELETE") {
          response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: "DELETE",
          });
        } else {
          throw new Error(`Unknown operation: ${type}`);
        }

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        await markOperationSynced(operation.operationId);
        synced++;
      } catch (error) {
        failed++;

        await recordOperationFailure(
          operation.operationId,
          error.message || "Sync failed"
        );

        console.error("Sync failed:", error);

        // Preserve operation order: retry this one before later operations.
        break;
      }
    }

    console.log(`Sync complete: ${synced} synced, ${failed} failed`);

    return { synced, failed };
  } finally {
    syncInProgress = false;
  }
}

// Automatically retry when connectivity returns.
window.addEventListener("online", () => {
  syncPendingOperations().catch(console.error);
});
