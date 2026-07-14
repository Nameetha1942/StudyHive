"use client";

import React, { useEffect, useState } from "react";
import { useCache } from "@/context/CacheContext";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Kanban, 
  Plus, 
  Calendar, 
  X, 
  Check, 
  ArrowRight, 
  Trash2,
  Filter
} from "lucide-react";

interface TasksProps {
  userId: string;
}

export default function Tasks({ userId }: TasksProps) {
  const { cache, setCache, fetchTasks, fetchGroups } = useCache();
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // New task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"exam" | "project" | "assignment" | "other">("other");
  const [dueDate, setDueDate] = useState("");
  const [groupId, setGroupId] = useState("");
  const [creating, setCreating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    // If no cache yet, show loading spinner
    const hasCache = cache.tasks.length > 0 && cache.joinedGroups.length > 0;
    if (!hasCache) setLoading(true);

    try {
      // 1. Fetch joined collaboratives
      const { joined } = await fetchGroups(userId);
      if (joined.length > 0 && !groupId) {
        setGroupId(joined[0].id); // Default group selection in form
      }

      // 2. Fetch tasks
      const groupIds = joined.map(g => g.id) || [];
      await fetchTasks(userId, groupIds);
    } catch (err) {
      console.error("Error loading task board cache:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !groupId) return;
    setCreating(true);

    try {
      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert({
          title,
          description,
          category,
          due_date: dueDate || null,
          group_id: groupId,
          assigned_to: userId,
          status: "todo",
        })
        .select("*, collaboratives(name), profiles(username)")
        .single();

      if (error) throw error;

      // Optimistic cache update for instant display
      setCache(prev => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
      }));

      setTitle("");
      setDescription("");
      setDueDate("");
      setShowModal(false);
    } catch (err: any) {
      console.error("Error creating task:", err);
      alert("Error: " + (err.message || "Failed to create task"));
    } finally {
      setCreating(false);
    }
  };

  const updateTaskStatus = async (taskId: string, nextStatus: "todo" | "inprogress" | "done") => {
    // Optimistic Cache update (runs instantly in memory)
    const oldTasks = [...cache.tasks];
    setCache(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    }));

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: nextStatus })
        .eq("id", taskId);

      if (error) throw error;

      // If task is completed, increment in-memory contribution score by +5
      if (nextStatus === "done" && cache.profile) {
        const nextScore = (cache.profile.contribution_score || 0) + 5;
        setCache(prev => ({
          ...prev,
          profile: prev.profile ? { ...prev.profile, contribution_score: nextScore } : null
        }));

        // Send query to database in background
        supabase
          .from("profiles")
          .update({ contribution_score: nextScore })
          .eq("id", userId)
          .then(({ error }: any) => {
            if (error) console.warn("Failed to sync completed task score:", error.message);
          });
      }
    } catch (err) {
      console.error("Failed to update task status, rolling back:", err);
      // Rollback cache if write fails
      setCache(prev => ({ ...prev, tasks: oldTasks }));
    }
  };

  const deleteTask = async (taskId: string) => {
    // Optimistic delete
    const oldTasks = [...cache.tasks];
    setCache(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId),
    }));

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete task, rolling back:", err);
      setCache(prev => ({ ...prev, tasks: oldTasks }));
    }
  };

  const joinedGroups = cache.joinedGroups;
  const filteredTasks = cache.tasks.filter(t => {
    return selectedGroupFilter === "All" || t.group_id === selectedGroupFilter;
  });

  const columns: { id: "todo" | "inprogress" | "done"; title: string; color: string }[] = [
    { id: "todo", title: "To Do", color: "border-t-zinc-400" },
    { id: "inprogress", title: "In Progress", color: "border-t-cyan-500" },
    { id: "done", title: "Completed", color: "border-t-indigo-500" },
  ];

  if (loading && cache.tasks.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative min-h-screen pb-20 overflow-hidden">
      {/* Dynamic Animated background detail for Kanban board */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-30 dark:opacity-20">
        <motion.div
          animate={{
            x: [-20, 20, -20],
            y: [-30, 30, -30],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[100px]"
        />
        <motion.div
          animate={{
            x: [30, -30, 30],
            y: [40, -40, 40],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px]"
        />
      </div>

      <div className="relative z-10 space-y-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Kanban Task Board
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Organize study sprints and revision targets. Complete tasks to earn points!
          </p>
        </div>
        <button
          onClick={() => {
            if (joinedGroups.length === 0) {
              alert("You must join at least one collaborative study group first!");
              return;
            }
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98] cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Workspace Task
        </button>
      </div>

      {/* Filter Options */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-zinc-400" />
        <select
          value={selectedGroupFilter}
          onChange={e => setSelectedGroupFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-500/5 dark:bg-zinc-800/10 text-zinc-900 dark:text-zinc-100 border border-zinc-200/50 dark:border-zinc-800/30 rounded-xl outline-none focus:border-indigo-500 text-sm cursor-pointer"
        >
          <option value="All">All Collaboratives</option>
          {joinedGroups.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start relative z-10">
        {columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <motion.div
              key={col.id}
              whileHover={{ y: -3, borderColor: "rgba(99, 102, 241, 0.2)", boxShadow: "0 10px 30px rgba(99, 102, 241, 0.05)" }}
              transition={{ duration: 0.3 }}
              className={`glass-card p-5 border-t-4 ${col.color} min-h-[500px] flex flex-col`}
            >
              {/* Column Title */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm tracking-wide uppercase text-zinc-400">
                  {col.title}
                </h3>
                <span className="text-xs font-bold bg-zinc-500/10 text-zinc-400 px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              {/* Lane containing Tasks with Framer Motion AnimatePresence & layout transition */}
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[600px] pr-1 relative">
                {colTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    No tasks in this lane
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {colTasks.map(task => (
                        <motion.div
                          key={task.id}
                          layout // Signature smooth transition to slide between columns!
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          whileHover={{ scale: 1.01 }}
                          className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/20 bg-zinc-500/5 hover:border-zinc-500/20 transition-colors duration-200 group flex flex-col justify-between min-h-[140px]"
                        >
                          <div>
                            {/* Tag & Category */}
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400">
                                {task.category}
                              </span>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-zinc-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Task Info */}
                            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                              {task.title}
                            </h4>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                              {task.description || "No description provided"}
                            </p>
                          </div>

                          {/* Footer Info */}
                          <div className="mt-4 pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {task.due_date 
                                  ? new Date(task.due_date).toLocaleDateString()
                                  : "No due date"}
                              </span>
                            </div>

                            {/* Move column buttons */}
                            <div className="flex items-center gap-1">
                              {col.id === "todo" && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, "inprogress")}
                                  className="w-6 h-6 rounded-lg bg-zinc-500/10 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Start Task"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {col.id === "inprogress" && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, "done")}
                                  className="w-6 h-6 rounded-lg bg-zinc-500/10 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Complete Task"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Creation Modal Zoom-in transition */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-md glass-card p-6 relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <Kanban className="w-5 h-5 text-indigo-500" />
                Add Group Task
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Create a task and assign it under a study collaborative.
              </p>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Solve physics problems 1-10"
                    className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Task notes, resources or instructions..."
                    className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[80px] placeholder:text-zinc-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                    >
                      <option value="exam">Exam Prep</option>
                      <option value="project">Project Work</option>
                      <option value="assignment">Assignment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Study Group (Collaborative)
                  </label>
                  <select
                    value={groupId}
                    onChange={e => setGroupId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                    required
                  >
                    {joinedGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-zinc-700/50 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl transition-all cursor-pointer text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all hover:shadow-md cursor-pointer text-sm flex items-center justify-center"
                  >
                    {creating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "Add Task"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
