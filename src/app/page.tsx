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
import { Megaphone, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
  
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isDark, setIsDark] = useState(true);
  const [announcement, setAnnouncement] = useState<any>(null);

  const supabase = createClient();
  const { cache, fetchProfile, clearCache } = useCache();

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
      async (event, newSession) => {
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
    if (session?.user) {
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
