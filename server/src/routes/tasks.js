
import { Router } from "express";

const router = Router();

// Temporary storage for development.
// Data resets whenever the server restarts.
const tasks = new Map();

// Get all tasks
router.get("/", (req, res) => {
  res.json([...tasks.values()]);
});

// Create a task
router.post("/", (req, res) => {
  const task = req.body;

  if (!task?.id || !task?.title) {
    return res.status(400).json({
      error: "Task id and title are required",
    });
  }

  // Repeating a create request won't duplicate the task.
  tasks.set(task.id, task);

  res.status(200).json({
    success: true,
    task: tasks.get(task.id),
  });
});

// Update a task
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const task = tasks.get(id);

  if (!task) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  const updatedTask = {
    ...task,
    ...req.body,
    id,
  };

  tasks.set(id, updatedTask);

  res.json({
    success: true,
    task: updatedTask,
  });
});

// Delete a task
router.delete("/:id", (req, res) => {
  tasks.delete(req.params.id);

  res.json({ success: true });
});

export default router;
