
import {
  getAllOperations,
  getPendingOperations,
} from "./indexedDB";

export async function inspectQueue() {
  const allOperations = await getAllOperations();
  const pendingOperations = await getPendingOperations();

  console.table(
    allOperations.map((operation) => ({
      id: operation.operationId,
      type: operation.type,
      taskId: operation.taskId,
      status: operation.status,
      attempts: operation.attempts,
      createdAt: operation.createdAt,
      lastError: operation.lastError,
    }))
  );

  console.log("Total operations:", allOperations.length);
  console.log("Pending operations:", pendingOperations.length);

  return {
    allOperations,
    pendingOperations,
  };
}
