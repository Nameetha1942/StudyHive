"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { CacheProvider, useCache } from "@/context/CacheContext";
import AuthScreen from "@/components/AuthScreen";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import Explore from "@/components/Explore";
import Tasks from "@/components/Tasks";
import Forum from "@/components/Forum";
import ResourceHub from "@/components/ResourceHub";
import StudyTimer from "@/components/StudyTimer";
import AdminPanel from "@/components/AdminPanel";
import { Megaphone, X, Database, Sparkles, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export default function Home() {
  return (
    <CacheProvider>
      <HomeContent />
    </CacheProvider>
  );
}

function HomeContent() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isDark, setIsDark] = useState(true);
  const [announcement, setAnnouncement] = useState<any>(null);

  const supabase = createClient();
  const { cache, fetchProfile, clearCache, setCache } = useCache();

  const startDemoMode = () => {
    setDemoMode(true);
    setSession({
      user: {
        id: "demo-user-123",
        email: "student-demo@studyhive.edu"
      }
    });
    setCache({
      profile: {
        id: "demo-user-123",
        username: "Alex Carter (Demo)",
        role: "admin",
        contribution_score: 840,
        focus_minutes: 360,
      },
      tasks: [
        {
          id: "task-1",
          title: "Complete Advanced Calculus Assignment 4",
          description: "Solve problems 1-15 on differential equations. Review Euler's method.",
          status: "todo",
          assigned_to: "demo-user-123",
          due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
          group_id: "group-1",
          collaboratives: { name: "Mathematics Study Circle" },
          profiles: { username: "Alex Carter (Demo)" }
        },
        {
          id: "task-2",
          title: "Prepare Slide Deck for AI Group Project",
          description: "Focus on neural network structures and transformers architecture summary.",
          status: "inprogress",
          assigned_to: "demo-user-123",
          due_date: new Date(Date.now() + 86400000).toISOString(),
          group_id: "group-2",
          collaboratives: { name: "AI Research Guild" },
          profiles: { username: "Alex Carter (Demo)" }
        },
        {
          id: "task-3",
          title: "Read Next.js 16 App Router Docs",
          description: "Study Server Actions, caching layers, and the new proxy.ts routing conventions.",
          status: "done",
          assigned_to: "demo-user-123",
          due_date: new Date().toISOString(),
          group_id: "group-3",
          collaboratives: { name: "Frontend Development Pioneers" },
          profiles: { username: "Alex Carter (Demo)" }
        }
      ],
      groups: [
        { id: "group-1", name: "Mathematics Study Circle", description: "Deep diving into advanced integration, linear algebra, and topology.", member_count: 8 },
        { id: "group-2", name: "AI Research Guild", description: "Discussing LLMs, computer vision, and state-of-the-art machine learning models.", member_count: 15 },
        { id: "group-3", name: "Frontend Development Pioneers", description: "Sharing UI/UX libraries, Next.js setups, and design patterns.", member_count: 12 }
      ],
      joinedGroups: [
        { id: "group-1", name: "Mathematics Study Circle", description: "Deep diving into advanced integration, linear algebra, and topology.", member_count: 8 },
        { id: "group-2", name: "AI Research Guild", description: "Discussing LLMs, computer vision, and state-of-the-art machine learning models.", member_count: 15 },
        { id: "group-3", name: "Frontend Development Pioneers", description: "Sharing UI/UX libraries, Next.js setups, and design patterns.", member_count: 12 }
      ],
      resources: [
        {
          id: "res-1",
          title: "Fourier Series Cheat Sheet",
          url: "https://example.com/fourier-cheat-sheet.pdf",
          group_id: "group-1",
          created_at: new Date().toISOString(),
          profiles: { username: "Professor Miller" }
        },
        {
          id: "res-2",
          title: "Introduction to Transformers Lecture Slides",
          url: "https://example.com/transformers-lecture.pdf",
          group_id: "group-2",
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          profiles: { username: "Dr. Chen" }
        }
      ],
      posts: {
        "group-1": [
          {
            id: "post-1",
            title: "Stuck on Green's Theorem proof",
            content: "Can someone help clarify why the double integral of the curl equals the line integral? Let's discuss in the study room tomorrow.",
            group_id: "group-1",
            user_id: "user-99",
            created_at: new Date().toISOString(),
            comment_count: 3,
            profiles: { username: "Emily Watson" }
          }
        ],
        "group-2": [
          {
            id: "post-2",
            title: "Thoughts on LLaMA 3 architectures?",
            content: "The grouping query attention (GQA) improvements seem to optimize context window throughput significantly. Here are my benchmark results...",
            group_id: "group-2",
            user_id: "demo-user-123",
            created_at: new Date(Date.now() - 3600000).toISOString(),
            comment_count: 5,
            profiles: { username: "Alex Carter (Demo)" }
          }
        ],
        "group-3": []
      },
      announcement: {
        id: "ann-1",
        content: "🔥 Announcement: The StudyHive offline sandbox is running. Set your Vercel database variables to persist your custom settings."
      }
    });
    setAnnouncement({
      content: "🔥 Announcement: The StudyHive offline sandbox is running. Set your Vercel database variables to persist your custom settings."
    });
  };

  useEffect(() => {
    // 1. Initial theme load (default dark)
    const savedTheme = localStorage.getItem("theme");
    const preferDark = savedTheme ? savedTheme === "dark" : true;
    setIsDark(preferDark);
    if (preferDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 2. Fetch Session
    const checkSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Supabase timeout")), 2000)
        );
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        setSession(session);
        if (session?.user) {
          fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 3. Listen to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, newSession: any) => {
        try {
          setSession(newSession);
          if (newSession?.user) {
            fetchProfile(newSession.user.id);
          } else {
            clearCache();
          }
        } catch (err) {
          console.error("Auth state change error:", err);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Listen to announcements updates in real-time
  useEffect(() => {
    if (isSupabaseConfigured && session?.user) {
      fetchLatestAnnouncement();

      // Subscribe to real-time announcements
      const channel = supabase
        .channel("announcements-feed")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "announcements" },
          (payload: any) => {
            setAnnouncement(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  const fetchLatestAnnouncement = async () => {
    try {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setAnnouncement(data[0]);
      }
    } catch (err) {
      console.warn("Failed to fetch announcements:", err);
    }
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    clearCache();
    setActiveTab("dashboard");
  };

  const handleSessionActive = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
    if (currentSession?.user) {
      await fetchProfile(currentSession.user.id);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If Supabase environment variables are missing, show interactive configuration wizard
  if (!isSupabaseConfigured && !demoMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Glow backgrounds */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div
            animate={{
              scale: [1, 1.15, 0.9, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/30 blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 0.9, 1.1, 1],
              opacity: [0.15, 0.2, 0.15],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-pink-600/30 blur-[120px]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl relative z-10 space-y-8"
        >
          <div className="text-center space-y-3">
            <div className="inline-flex p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shadow-inner">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              StudyHive Sandbox Portal
            </h1>
            <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
              Your student collaboration platform is online, but requires connecting to a Supabase database instance.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Database className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-slate-200 text-sm">Supabase Connection Required</h2>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              To persist authentication, tasks, bookmarks, resources, and live chats, configure these environment variables on Vercel:
            </p>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                <span className="text-slate-300">NEXT_PUBLIC_SUPABASE_URL</span>
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md text-[10px] font-semibold tracking-wide uppercase">Missing</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                <span className="text-slate-300">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span>
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md text-[10px] font-semibold tracking-wide uppercase">Missing</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-medium transition-all shadow-lg shadow-indigo-600/25 group cursor-pointer text-sm"
            >
              <span>Setup on Vercel</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>

            <button
              onClick={startDemoMode}
              className="flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700/80 text-indigo-300 border border-indigo-500/10 hover:border-indigo-500/20 rounded-2xl font-medium transition-all cursor-pointer text-sm"
            >
              <span>Launch Demo Mode</span>
              <Sparkles className="w-4 h-4 text-pink-400" />
            </button>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-500 leading-relaxed block">
              Demo mode runs locally in browser memory. Perfect for previewing layouts, Pomodoro timers, and Kanban logic.
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  // If user is not authenticated, show login page
  if (!session) {
    return <AuthScreen onSessionActive={handleSessionActive} />;
  }

  const profile = cache.profile;

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300 relative overflow-hidden">
      {/* Dynamic Animated Glow Blobs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -50, 40, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -70, 50, 0],
            y: [0, 60, -60, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{
            duration: 26,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/10 dark:bg-cyan-500/5 blur-[130px]"
        />
        <motion.div
          animate={{
            x: [0, 30, -30, 0],
            y: [0, 40, -30, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/3 w-[350px] h-[350px] rounded-full bg-pink-500/5 dark:bg-pink-500/3 blur-[100px]"
        />
      </div>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={profile?.role || "student"}
        username={profile?.username || "Student"}
        onLogout={handleLogout}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 pl-64 min-w-0 transition-all duration-300 relative z-10">
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-6">
          {/* Announcement Banner */}
          <AnimatePresence>
            {announcement && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-md shadow-indigo-500/5 relative overflow-hidden flex items-start gap-3"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl"></div>
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
                  <Megaphone className="w-4 h-4 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h4 className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                    Important Broadcast
                  </h4>
                  <p className="text-sm text-zinc-300 mt-1 leading-relaxed">
                    {announcement.content}
                  </p>
                </div>
                <button
                  onClick={() => setAnnouncement(null)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Tab Panel Selector with Slide & Fade Transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-full"
            >
              {activeTab === "dashboard" && (
                <Dashboard userId={session.user.id} setActiveTab={setActiveTab} />
              )}
              {activeTab === "explore" && <Explore userId={session.user.id} />}
              {activeTab === "kanban" && <Tasks userId={session.user.id} />}
              {activeTab === "forum" && (
                <Forum userId={session.user.id} username={profile?.username || "Scholars"} />
              )}
              {activeTab === "resources" && <ResourceHub userId={session.user.id} />}
              {activeTab === "timer" && (
                <StudyTimer userId={session.user.id} username={profile?.username || "Scholars"} />
              )}
              {activeTab === "admin" && profile?.role === "admin" && (
                <AdminPanel userId={session.user.id} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
