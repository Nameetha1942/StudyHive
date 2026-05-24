"use client";

import React, { useEffect, useState } from "react";
import { useCache } from "@/context/CacheContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Clock, 
  CheckCircle2, 
  Users, 
  Calendar, 
  TrendingUp, 
  ArrowRight,
  Award
} from "lucide-react";

interface DashboardProps {
  userId: string;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ userId, setActiveTab }: DashboardProps) {
  const { cache, fetchProfile, fetchTasks, fetchGroups } = useCache();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [userId]);

  const loadData = async () => {
    // If we have no cache yet, show loading spinner initially
    const hasCache = cache.profile && cache.groups.length > 0;
    if (!hasCache) setLoading(true);

    try {
      // 1. Fetch Profile
      const prof = await fetchProfile(userId);
      
      // 2. Fetch Groups list (needed to get groupIds)
      const { joined } = await fetchGroups(userId);
      const groupIds = joined.map(g => g.id) || [];

      // 3. Fetch Tasks
      await fetchTasks(userId, groupIds);
    } catch (err) {
      console.error("Dashboard cache load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const profile = cache.profile;
  const tasks = cache.tasks;
  const joinedGroups = cache.joinedGroups;

  // Process Task Matrix statistics
  const todo = tasks.filter(t => t.status === "todo").length;
  const inprogress = tasks.filter(t => t.status === "inprogress").length;
  const done = tasks.filter(t => t.status === "done").length;

  const taskStats = [
    { name: "To Do", value: todo || 0, color: "#a1a1aa" },
    { name: "In Progress", value: inprogress || 0, color: "#06b6d4" },
    { name: "Completed", value: done || 0, color: "#6366f1" },
  ];

  // Upcoming deadlines filter
  const deadlines = tasks
    .filter(t => t.status !== "done" && t.due_date)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3);

  // Determine contribution badge
  const getBadge = (score: number) => {
    if (score >= 100) return { title: "Queen Bee", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (score >= 50) return { title: "Honey Maker", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
    if (score >= 20) return { title: "Forager", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
    return { title: "Laval Bee", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" };
  };

  const badge = getBadge(profile?.contribution_score || 0);

  // SVG circular Ring properties
  const dailyFocusGoal = 120;
  const currentFocus = profile?.focus_minutes || 0;
  const focusPercentage = Math.min(Math.round((currentFocus / dailyFocusGoal) * 100), 100);

  // Stagger Animations variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
    hover: { y: -4, transition: { duration: 0.2 } }
  };

  const cardIconVariants: Record<string, any> = {
    clock: {
      hover: { rotate: 360, scale: 1.25, transition: { type: "spring" as const, stiffness: 300, damping: 12 } }
    },
    trophy: {
      hover: { y: [0, -6, 4, -4, 0], scale: 1.25, transition: { duration: 0.6 } }
    },
    check: {
      hover: { scale: [1, 1.3, 1], rotate: [0, 15, -15, 0], transition: { duration: 0.5 } }
    },
    users: {
      hover: { scale: 1.25, x: [0, -4, 4, 0], transition: { duration: 0.5 } }
    }
  };

  const mockActivities = [
    { text: "You registered your account inside the StudyHive.", time: "Joined today" },
    { text: "Completed focus session in the Study Zone.", time: `${currentFocus}m logged` },
    ...(profile?.contribution_score > 0 ? [{ text: "Earned collaboration points by sharing resources.", time: "Active" }] : [])
  ];

  if (loading && !profile) {
    return (
      <div className="flex-1 flex items-center justify-center h-[70vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const hasTasks = tasks.length > 0;
  const displayTaskStats = hasTasks ? taskStats : [
    { name: "To Do", value: 1, color: "#a1a1aa" },
    { name: "In Progress", value: 2, color: "#06b6d4" },
    { name: "Completed", value: 3, color: "#6366f1" }
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 relative"
    >
      {/* Dynamic Dashboard Ambient Background */}
      <div className="absolute inset-0 -m-6 pointer-events-none overflow-hidden z-0 rounded-3xl opacity-40 dark:opacity-25">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(99,102,241,0.3),rgba(255,255,255,0))]"></div>
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-1/4 left-10 w-64 h-64 rounded-full bg-gradient-to-tr from-indigo-500/8 to-violet-500/8 blur-2xl"
        />
        <motion.div
          animate={{
            y: [0, 40, 0],
            x: [0, -20, 0],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-1/4 right-10 w-80 h-80 rounded-full bg-gradient-to-tr from-cyan-500/8 to-emerald-500/8 blur-3xl"
        />
      </div>

      <div className="relative z-10 space-y-8">
      {/* Welcome Banner */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Hello, {profile?.username || "Student"}! 👋
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Welcome back to the hive. Here is your collaboration and learning breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("timer")}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98] cursor-pointer flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Start Study Session
          </motion.button>
        </div>
      </motion.div>

      {/* Onboarding / Getting Started Checklist */}
      {joinedGroups.length === 0 && (
        <motion.div 
          variants={itemVariants}
          className="glass-card p-6 border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl animate-pulse"></div>
          <h3 className="text-base font-bold text-indigo-400 mb-2 flex items-center gap-2">
            🚀 Welcome to the Hive! Let's get you started
          </h3>
          <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
            Follow this simple onboarding checklist to discover the platform, join study circles, and start logging focus time.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 bg-background/50 flex items-start gap-3"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 font-semibold">1</span>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-semibold">Join a Group</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Find a study circle or course workspace.</p>
                <button onClick={() => setActiveTab("explore")} className="text-[10px] text-indigo-400 font-bold hover:underline mt-2 block cursor-pointer">
                  Explore Groups ➔
                </button>
              </div>
            </motion.div>
            {/* Step 2 */}
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 bg-background/50 flex items-start gap-3"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 font-semibold">2</span>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-semibold">Add a Task</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Schedule a sprint target on the Kanban board.</p>
                <button onClick={() => setActiveTab("kanban")} className="text-[10px] text-indigo-400 font-bold hover:underline mt-2 block cursor-pointer">
                  Kanban Board ➔
                </button>
              </div>
            </motion.div>
            {/* Step 3 */}
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 bg-background/50 flex items-start gap-3"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 font-semibold">3</span>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-semibold">Ask a Question</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Post questions or links in the forum.</p>
                <button onClick={() => setActiveTab("forum")} className="text-[10px] text-indigo-400 font-bold hover:underline mt-2 block cursor-pointer">
                  Discussion Forum ➔
                </button>
              </div>
            </motion.div>
            {/* Step 4 */}
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 bg-background/50 flex items-start gap-3"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 font-semibold">4</span>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-semibold">Focus Session</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Run a Pomodoro clock and log minutes.</p>
                <button onClick={() => setActiveTab("timer")} className="text-[10px] text-indigo-400 font-bold hover:underline mt-2 block cursor-pointer">
                  Study Timer ➔
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Overview Cards */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Card 1: Focus Minutes */}
        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="glass-card p-6 flex items-center gap-5 relative overflow-hidden group cursor-pointer hover:border-indigo-500/30 hover:shadow-indigo-500/5 hover:shadow-lg transition-colors duration-300"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 text-indigo-500 dark:text-indigo-400">
            <motion.div variants={cardIconVariants.clock}>
              <Clock className="w-6 h-6" />
            </motion.div>
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Focus Time
            </span>
            <h3 className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">
              {profile?.focus_minutes || 0} <span className="text-sm font-normal text-zinc-400">min</span>
            </h3>
          </div>
        </motion.div>

        {/* Card 2: Contribution Points */}
        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="glass-card p-6 flex items-center gap-5 relative overflow-hidden group cursor-pointer hover:border-amber-500/30 hover:shadow-amber-500/5 hover:shadow-lg transition-colors duration-300"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="w-12 h-12 rounded-xl bg-amber-600/10 flex items-center justify-center border border-amber-500/20 text-amber-500 dark:text-amber-400">
            <motion.div variants={cardIconVariants.trophy}>
              <Trophy className="w-6 h-6" />
            </motion.div>
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Hive Points
            </span>
            <h3 className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">
              {profile?.contribution_score || 0} <span className="text-sm font-normal text-zinc-400">pts</span>
            </h3>
          </div>
        </motion.div>

        {/* Card 3: Tasks Done */}
        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="glass-card p-6 flex items-center gap-5 relative overflow-hidden group cursor-pointer hover:border-emerald-500/30 hover:shadow-emerald-500/5 hover:shadow-lg transition-colors duration-300"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="w-12 h-12 rounded-xl bg-emerald-600/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500 dark:text-emerald-400">
            <motion.div variants={cardIconVariants.check}>
              <CheckCircle2 className="w-6 h-6" />
            </motion.div>
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Tasks Solved
            </span>
            <h3 className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">
              {done}
            </h3>
          </div>
        </motion.div>

        {/* Card 4: Collaboratives Joined */}
        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="glass-card p-6 flex items-center gap-5 relative overflow-hidden group cursor-pointer hover:border-cyan-500/30 hover:shadow-cyan-500/5 hover:shadow-lg transition-colors duration-300"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="w-12 h-12 rounded-xl bg-cyan-600/10 flex items-center justify-center border border-cyan-500/20 text-cyan-500 dark:text-cyan-400">
            <motion.div variants={cardIconVariants.users}>
              <Users className="w-6 h-6" />
            </motion.div>
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              My Groups
            </span>
            <h3 className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">
              {joinedGroups.length}
            </h3>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Dash Charts & Visual Analytics */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Visual Progress Goal (SVG Circle) */}
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <h3 className="text-lg font-bold w-full text-left mb-6 text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Daily Focus Goal
          </h3>
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="70"
                className="stroke-zinc-100 dark:stroke-zinc-800"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="88"
                cy="88"
                r="70"
                className="stroke-indigo-600 dark:stroke-indigo-500 transition-all duration-1000 ease-out"
                strokeWidth="12"
                strokeDasharray="439.8"
                strokeDashoffset={439.8 - (439.8 * focusPercentage) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                {focusPercentage}%
              </span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                {currentFocus} / {dailyFocusGoal} min
              </span>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mt-6 leading-relaxed">
            {focusPercentage >= 100 
              ? "Awesome work! You hit your daily study goal today! 🎉" 
              : `Commit another ${dailyFocusGoal - currentFocus} minutes to hit your goal.`}
          </p>
        </div>

        {/* Recharts Task Completion Breakdown */}
        <div className="glass-card p-6 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2">
              Task Matrix
            </h3>
            <p className="text-xs text-zinc-400">
              Visual breakdown of task statuses assigned to you.
            </p>
          </div>
          <div className="h-44 w-full relative min-w-0">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayTaskStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {displayTaskStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            {!hasTasks && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 bg-background/10 backdrop-blur-[1px] pointer-events-none">
                Demo Stats (No Tasks Yet)
              </div>
            )}
          </div>
          {/* Legend Grid */}
          <div className="grid grid-cols-3 gap-2 text-center border-t border-zinc-200/50 dark:border-zinc-800/30 pt-4">
            {displayTaskStats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: stat.color }}></span>
                  {stat.name}
                </div>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-1">
                  {hasTasks ? stat.value : 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Level and Achievements (Contribution) */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
                Rank Badge
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Based on posts, comments, and links shared.
              </p>
            </div>
            <Award className="w-8 h-8 text-indigo-500" />
          </div>

          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="my-6 p-4 rounded-xl border flex items-center gap-4 bg-zinc-500/5 border-zinc-500/10"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-500/30">
              <Trophy className="w-6 h-6 text-amber-500 animate-bounce" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 uppercase font-bold tracking-widest">
                Current Standing
              </span>
              <h4 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                {badge.title}
              </h4>
            </div>
          </motion.div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-zinc-400">
              <span>Next Rank (Honey Maker)</span>
              <span>{Math.min(profile?.contribution_score || 0, 50)} / 50 pts</span>
            </div>
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((profile?.contribution_score || 0) / 50) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Groups & Deadlines Split Grid */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Study Groups */}
        <div className="glass-card p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
                My Collaboratives
              </h3>
              <button 
                onClick={() => setActiveTab("explore")}
                className="text-xs text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Join More <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {joinedGroups.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-sm">
                No study groups joined yet. Head over to the Explore page to find collaboration spaces!
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {joinedGroups.map((group) => (
                  <div 
                    key={group.id} 
                    className="p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 bg-zinc-500/5 flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {group.name}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate max-w-[200px] md:max-w-[300px] mt-0.5">
                        {group.description || "No description provided"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-zinc-400 font-bold bg-zinc-500/10 px-2 py-0.5 rounded-full">
                        <Users className="w-3.5 h-3.5" />
                        Active
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Deadlines & Activity Split */}
        <div className="glass-card p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4">
              Upcoming Deadlines
            </h3>
            {deadlines.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-sm">
                No upcoming deadlines! Create tasks in the Kanban board.
              </div>
            ) : (
              <div className="space-y-3">
                {deadlines.map((task, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 bg-zinc-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {task.title}
                        </h4>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 mt-1 block">
                          {task.category || "Task"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/10">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200/50 dark:border-zinc-800/30 pt-4 mt-4">
            <h4 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
              Recent Log
            </h4>
            <div className="space-y-1.5">
              {mockActivities.map((act, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[250px]">{act.text}</span>
                  <span className="text-zinc-400">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </motion.div>
  );
}
