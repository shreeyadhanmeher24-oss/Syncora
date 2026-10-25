
import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Check,
  Circle,
  Clock3,
  Wifi,
  WifiOff,
  Trash2,
  RefreshCw,
  ListTodo,
  CalendarDays,
} from "lucide-react";

import {
  getAllTasks,
  saveTask,
  deleteTask,
  enqueueOperation,
  getPendingOperations,
} from "./db/indexedDB";

import { syncPendingOperations } from "./services/syncService";
import "./index.css";

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    const operations = await getPendingOperations();
    setPendingCount(operations.length);
    return operations;
  }, []);

  // Attempt synchronization and refresh task sync indicators.
  const runSync = useCallback(async () => {
    if (!navigator.onLine) {
      await refreshPendingCount();
      return;
    }

    setSyncing(true);

    try {
      const result = await syncPendingOperations();

      const pendingOperations = await refreshPendingCount();

      // Only show a task as synced when it has no pending operations.
      const pendingTaskIds = new Set(
        pendingOperations.map((operation) => operation.taskId)
      );

      const savedTasks = await getAllTasks();

      const updatedTasks = savedTasks.map((task) => ({
        ...task,
        syncStatus: pendingTaskIds.has(task.id)
          ? "pending"
          : "synced",
      }));

      // Persist the updated sync indicators locally.
      for (const task of updatedTasks) {
        const original = savedTasks.find(
          (item) => item.id === task.id
        );

        if (original?.syncStatus !== task.syncStatus) {
          await saveTask(task);
        }
      }

      setTasks(updatedTasks);

      if (result.failed > 0) {
        console.warn(
          `${result.failed} sync operation(s) failed and remain pending.`
        );
      }
    } catch (error) {
      console.error("Sync attempt failed:", error);

      try {
        await refreshPendingCount();
      } catch (countError) {
        console.error("Could not refresh pending count:", countError);
      }
    } finally {
      setSyncing(false);
    }
  }, [refreshPendingCount]);

  // Load local tasks, then attempt to sync older queued operations.
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const savedTasks = await getAllTasks();
        const operations = await getPendingOperations();

        if (cancelled) return;

        setTasks(savedTasks);
        setPendingCount(operations.length);
      } catch (error) {
        console.error("Could not load Syncora data:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      if (!cancelled && navigator.onLine) {
        void runSync();
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [runSync]);

  // Track connectivity and retry when the browser comes online.
  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      void runSync();
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [runSync]);

  async function addTask(event) {
    event.preventDefault();

    if (!title.trim()) return;

    const task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      completed: false,
      syncStatus: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      // Save locally first so the task works offline.
      await saveTask(task);

      await enqueueOperation({
        type: "CREATE",
        taskId: task.id,
        payload: task,
      });

      setTasks((current) => [task, ...current]);
      setTitle("");
      setDescription("");

      await refreshPendingCount();

      // Try syncing in the background.
      void runSync();
    } catch (error) {
      console.error("Could not save or queue task:", error);
      alert("Could not save the task. Check the console.");
    }
  }

  async function toggleTask(task) {
    const updated = {
      ...task,
      completed: !task.completed,
      syncStatus: "pending",
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveTask(updated);

      await enqueueOperation({
        type: "UPDATE",
        taskId: updated.id,
        payload: updated,
      });

      setTasks((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      await refreshPendingCount();

      void runSync();
    } catch (error) {
      console.error("Could not update or queue task:", error);
      alert("Could not update the task. Check the console.");
    }
  }

  async function removeTask(id) {
    const task = tasks.find((item) => item.id === id);

    if (!task) return;

    try {
      // Queue deletion before removing the local task.
      await enqueueOperation({
        type: "DELETE",
        taskId: id,
        payload: { id },
      });

      await deleteTask(id);

      setTasks((current) =>
        current.filter((item) => item.id !== id)
      );

      await refreshPendingCount();

      void runSync();
    } catch (error) {
      console.error("Could not delete or queue task:", error);
      alert("Could not delete the task. Check the console.");
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const query = search.toLowerCase();

    const matchesSearch =
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query);

    const matchesFilter =
      filter === "All" ||
      (filter === "Active" && !task.completed) ||
      (filter === "Completed" && task.completed);

    return matchesSearch && matchesFilter;
  });

  const completedCount = tasks.filter(
    (task) => task.completed
  ).length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-icon">
            <RefreshCw size={22} />
          </span>
          <span>
            syncora<span className="brand-dot">.</span>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <button type="button" className="nav-item active">
          <ListTodo size={18} />
          My Tasks
          <span className="nav-count">{tasks.length}</span>
        </button>

        <div className="sidebar-bottom">
          <div className={`connection-card ${online ? "" : "offline"}`}>
            {online ? <Wifi size={18} /> : <WifiOff size={18} />}

            <div>
              <strong>
                {online ? "You're online" : "You're offline"}
              </strong>
              <p>
                {online
                  ? syncing
                    ? "Syncing your changes..."
                    : "Changes saved locally"
                  : "Changes saved locally"}
              </p>
            </div>

            <span className="status-dot" />
          </div>

          <div className="profile">
            <div className="avatar">S</div>
            <div>
              <strong>My Workspace</strong>
              <p>Personal tasks</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> My Tasks
          </div>

          <div className="topbar-status">
            <span
              className={`live-dot ${online ? "" : "offline-dot"}`}
            />
            {syncing
              ? "Syncing..."
              : online
                ? "Connected"
                : "Offline mode"}
          </div>
        </header>

        <div className="content">
          <section className="welcome">
            <div>
              <p className="eyebrow">YOUR SPACE, YOUR PACE</p>
              <h1>
                Get things <span>done.</span>
              </h1>
              <p className="welcome-subtitle">
                Your tasks stay with you, even when your connection doesn't.
              </p>
            </div>

            <div className="date-card">
              <CalendarDays size={19} />
              <div>
                <strong>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </strong>
                <span>Today</span>
              </div>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon indigo">
                <ListTodo size={19} />
              </div>
              <p>Total tasks</p>
              <strong>{tasks.length}</strong>
              <span>Across your workspace</span>
            </div>

            <div className="stat-card">
              <div className="stat-icon teal">
                <Check size={19} />
              </div>
              <p>Completed</p>
              <strong>{completedCount}</strong>
              <span>
                {tasks.length
                  ? Math.round((completedCount / tasks.length) * 100)
                  : 0}
                % of all tasks
              </span>
            </div>

            <div className="stat-card">
              <div className="stat-icon amber">
                <Clock3 size={19} />
              </div>
              <p>Pending sync</p>
              <strong>{pendingCount}</strong>
              <span>Operations awaiting sync</span>
            </div>
          </section>

          <section className="task-section">
            <div className="section-heading">
              <div>
                <h2>Your tasks</h2>
                <p>A little progress goes a long way.</p>
              </div>
              <span className="task-total">
                {filteredTasks.length} tasks
              </span>
            </div>

            <form className="task-form" onSubmit={addTask}>
              <div className="form-heading">
                <span className="form-plus">
                  <Plus size={18} />
                </span>
                <div>
                  <strong>Create a task</strong>
                  <p>It'll be saved on this device first.</p>
                </div>
              </div>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What needs to get done?"
                aria-label="Task title"
                maxLength={150}
                required
              />

              <input
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Add a note (optional)"
                aria-label="Task description"
                maxLength={500}
              />

              <div className="form-footer">
                <span>
                  <WifiOff size={14} /> Offline-ready design
                </span>
                <button type="submit" className="add-button">
                  <Plus size={17} /> Add task
                </button>
              </div>
            </form>

            <div className="task-toolbar">
              <div className="filter-tabs">
                {["All", "Active", "Completed"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={
                      filter === item
                        ? "filter-tab selected"
                        : "filter-tab"
                    }
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <label className="search-box">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tasks"
                  aria-label="Search tasks"
                />
              </label>
            </div>

            <div className="task-list">
              {loading ? (
                <div className="empty-state">
                  <RefreshCw className="empty-icon" size={25} />
                  <h3>Loading your tasks...</h3>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <ListTodo size={27} />
                  </div>
                  <h3>
                    {search ? "No matching tasks" : "A fresh start."}
                  </h3>
                  <p>
                    {search
                      ? "Try a different search term."
                      : "Add your first task above. It'll be waiting here when you return."}
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <article className="task-row" key={task.id}>
                    <button
                      type="button"
                      className={`task-check ${
                        task.completed ? "checked" : ""
                      }`}
                      onClick={() => toggleTask(task)}
                      aria-label={
                        task.completed ? "Mark active" : "Complete task"
                      }
                    >
                      {task.completed ? (
                        <Check size={16} />
                      ) : (
                        <Circle size={19} />
                      )}
                    </button>

                    <div className="task-details">
                      <h3
                        className={
                          task.completed ? "completed-title" : ""
                        }
                      >
                        {task.title}
                      </h3>

                      {task.description && <p>{task.description}</p>}

                      <span className="task-sync">
                        <span className="pending-dot" />
                        {task.syncStatus === "pending"
                          ? "Awaiting sync"
                          : "Synced"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => removeTask(task.id)}
                      aria-label={`Delete ${task.title}`}
                      title="Delete task"
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>

          <footer className="app-footer">
            <span>
              <span className="footer-dot" /> Local-first by design
            </span>
            <span>
              Syncora <span className="footer-separator">·</span>{" "}
              Work anywhere. Sync everywhere.
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default App;
