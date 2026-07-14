"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Flame, Users, Volume2, VolumeX, Coffee, Brain, Sparkles } from "lucide-react";

interface StudyTimerProps {
  userId: string;
  username: string;
}

export default function StudyTimer({ userId, username }: StudyTimerProps) {
  // Timer States
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Presence / Online users
  const [onlineBuddies, setOnlineBuddies] = useState<any[]>([]);

  const supabase = createClient();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound generator
  const playAlert = () => {
    if (!soundEnabled) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, context.currentTime); // Hz
      gain.gain.setValueAtTime(0.3, context.currentTime);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.35); // 350ms beep
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  };

  // Timer Tick Engine
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isBreak]);

  // Real-time Presence Sync (Study Buddies)
  useEffect(() => {
    // 1. Establish Presence channel
    const presenceChannel = supabase.channel("study-zone-presence", {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const buddies: any[] = [];
        
        Object.keys(state).forEach((key) => {
          const presenceList = state[key] as any;
          if (presenceList && presenceList[0]) {
            buddies.push({
              userId: key,
              username: presenceList[0].username,
              isStudying: presenceList[0].isStudying,
            });
          }
        });
        
        setOnlineBuddies(buddies);
      })
      .subscribe(async (status: any) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            username: username,
            isStudying: isActive,
          });
        }
      });

    // Save tracking state when active state changes
    if (isActive) {
      presenceChannel.track({
        username: username,
        isStudying: true,
      });
    }

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [isActive, username, userId]);

  const handleTimerComplete = async () => {
    setIsActive(false);
    playAlert();

    if (!isBreak) {
      // Focus Completed! Save 25 minutes to user profile
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("focus_minutes, contribution_score")
          .eq("id", userId)
          .single();

        const currentMinutes = prof?.focus_minutes || 0;
        const currentScore = prof?.contribution_score || 0;

        await supabase
          .from("profiles")
          .update({
            focus_minutes: currentMinutes + 25,
            // Reward 5 contribution points for completing a sprint!
            contribution_score: currentScore + 10,
          })
          .eq("id", userId);

        alert("Congratulations! You completed a 25-minute study sprint! 🚀 +10 Hive Points!");
      } catch (err) {
        console.error("Failed to update focus minutes:", err);
      }

      // Transition to break
      setIsBreak(true);
      setSecondsLeft(5 * 60); // 5 min break
    } else {
      // Break Completed! Transition to focus
      setIsBreak(false);
      setSecondsLeft(25 * 60);
      alert("Break is over! Time to get back in the zone.");
    }
  };

  const handleToggle = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsBreak(false);
    setSecondsLeft(25 * 60);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in relative min-h-screen pb-20 overflow-hidden z-10">
      {/* Decorative floating grids and particles inside Study Timer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-30 dark:opacity-20">
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-10 left-1/3 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, -50, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]"
        />
      </div>

      {/* Clock Widget Card */}
      <div className="lg:col-span-2 glass-card p-8 flex flex-col items-center justify-center text-center min-h-[480px] relative overflow-hidden group z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>

        {/* Ambient Ring indicator */}
        <div className={`relative w-72 h-72 flex items-center justify-center rounded-full border transition-all duration-500 shadow-inner ${
          isActive
            ? "border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)] bg-indigo-500/5"
            : "border-zinc-200/50 dark:border-zinc-800/30"
        }`}>
          {/* Dashed spinning border */}
          <motion.div
            animate={isActive ? { rotate: 360 } : { rotate: 0 }}
            transition={isActive ? { repeat: Infinity, duration: 12, ease: "linear" } : { duration: 0.5 }}
            className={`absolute inset-4 rounded-full border-4 border-dashed transition-all duration-1000 ${
              isActive 
                ? "border-indigo-500/40" 
                : "border-zinc-500/10"
            }`}
          />

          {/* Time display */}
          <div className="z-10 flex flex-col items-center">
            {/* Animated Symbolic Status Icon */}
            <AnimatePresence mode="wait">
              {isActive && !isBreak && (
                <motion.div
                  key="focus-flame"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="text-rose-500 mb-2 flex justify-center"
                  title="Focus Fire"
                >
                  <Flame className="w-9 h-9 fill-rose-500/10" />
                </motion.div>
              )}
              {isActive && isBreak && (
                <motion.div
                  key="break-coffee"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ y: [0, -3, 0], scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="text-emerald-500 mb-2 flex justify-center"
                  title="Break Time"
                >
                  <Coffee className="w-9 h-9" />
                </motion.div>
              )}
              {!isActive && (
                <motion.div
                  key="ready-brain"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="text-zinc-400 dark:text-zinc-500 mb-2 flex justify-center"
                  title="Timer Ready"
                >
                  <Brain className="w-9 h-9" />
                </motion.div>
              )}
            </AnimatePresence>

            <span className="text-6xl font-extrabold tracking-tight tabular-nums text-zinc-900 dark:text-white">
              {formatTime(secondsLeft)}
            </span>
            <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border mt-4 ${
              isBreak 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" 
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/15"
            }`}>
              {isBreak ? "Break Time" : "Focus Zone"}
            </span>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex gap-4 items-center mt-10">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-12 h-12 rounded-xl bg-zinc-500/5 hover:bg-zinc-500/10 border border-zinc-200/50 dark:border-zinc-800/30 text-zinc-400 hover:text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Start/Pause */}
          <button
            onClick={handleToggle}
            className={`w-28 py-3 rounded-xl font-semibold text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
              isActive
                ? "bg-rose-600 shadow-rose-600/25 hover:bg-rose-700"
                : "bg-indigo-600 shadow-indigo-600/25 hover:bg-indigo-700"
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Focus
              </>
            )}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-12 h-12 rounded-xl bg-zinc-500/5 hover:bg-zinc-500/10 border border-zinc-200/50 dark:border-zinc-800/30 text-zinc-400 hover:text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Online Study Buddies (Presence Panel) */}
      <div className="glass-card p-6 flex flex-col">
        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-indigo-500" />
          Studying Together
        </h3>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          See who is online in the Study Zone. Sync timers to study in sync!
        </p>

        {/* Buddies List */}
        <div className="space-y-4 flex-1 overflow-y-auto max-h-[320px]">
          {onlineBuddies.length <= 1 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No other study partners online right now. Invite a peer to join your zone!
            </div>
          ) : (
            onlineBuddies
              .filter(b => b.userId !== userId) // Filter out current user
              .map((buddy) => (
                <div
                  key={buddy.userId}
                  className="p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 bg-zinc-500/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-semibold relative">
                      {buddy.username.charAt(0).toUpperCase()}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-zinc-950 bg-emerald-500"></span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {buddy.username}
                      </h4>
                      <span className="text-[10px] text-zinc-400">Online</span>
                    </div>
                  </div>

                  {buddy.isStudying ? (
                    <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Flame className="w-3 h-3 text-indigo-500 animate-pulse" />
                      In Zone
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded-md">
                      Idle
                    </span>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
