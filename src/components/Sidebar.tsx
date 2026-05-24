"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Search, 
  Kanban, 
  MessageSquare, 
  FolderPlus, 
  Timer, 
  ShieldAlert,
  LogOut, 
  Sun, 
  Moon,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: "student" | "admin";
  username: string;
  onLogout: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  userRole,
  username,
  onLogout,
  isDark,
  toggleTheme
}: SidebarProps) {
  
  // Custom micro-animations for Lucide icons
  const iconVariants: Record<string, any> = {
    dashboard: {
      hover: { scale: 1.15, rotate: 10, transition: { type: "spring" as const, stiffness: 400, damping: 10 } }
    },
    explore: {
      hover: { x: [0, -3, 3, -3, 3, 0], transition: { duration: 0.4 } }
    },
    kanban: {
      hover: { y: [0, -3, 2, -3, 0], transition: { duration: 0.4 } }
    },
    forum: {
      hover: { rotate: [0, -10, 10, -10, 0], transition: { duration: 0.4 } }
    },
    resources: {
      hover: { scale: 1.15, rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }
    },
    timer: {
      hover: { rotate: 360, transition: { duration: 0.8, ease: "easeInOut" } }
    },
    admin: {
      hover: { scale: 1.1, y: [0, -2, 2, 0], transition: { repeat: Infinity, duration: 1 } }
    }
  };

  const menuItems: { id: string; label: string; icon: any; variantKey: keyof typeof iconVariants }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, variantKey: "dashboard" },
    { id: "explore", label: "Explore Groups", icon: Search, variantKey: "explore" },
    { id: "kanban", label: "Kanban Board", icon: Kanban, variantKey: "kanban" },
    { id: "forum", label: "Discussion Forum", icon: MessageSquare, variantKey: "forum" },
    { id: "resources", label: "Resource Hub", icon: FolderPlus, variantKey: "resources" },
    { id: "timer", label: "Study Timer", icon: Timer, variantKey: "timer" },
  ];

  if (userRole === "admin") {
    menuItems.push({ id: "admin", label: "Admin Control", icon: ShieldAlert, variantKey: "admin" });
  }

  return (
    <aside className="w-64 glass border-r border-zinc-200/50 dark:border-zinc-800/30 flex flex-col justify-between h-screen fixed left-0 top-0 z-20 transition-all duration-300">
      {/* Upper Logo / User Panel */}
      <div className="flex flex-col flex-1 py-6">
        {/* Brand Logo with Float animation */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="flex items-center gap-3 px-6 mb-8 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 shadow-inner overflow-hidden">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className="flex items-center justify-center"
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              StudyHive
            </h1>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-medium">
              Collab Platform
            </span>
          </div>
        </motion.div>

        {/* User Card with Scale-up effect */}
        <div className="px-4 mb-6">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="p-4 rounded-xl bg-zinc-500/5 border border-zinc-500/10 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-semibold truncate leading-tight text-zinc-800 dark:text-zinc-200">
                {username}
              </h2>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                userRole === "admin" 
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              }`}>
                {userRole}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Navigation Items with Sliding Active Pill */}
        <nav className="flex-1 space-y-1.5 px-3 overflow-y-auto relative">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 cursor-pointer relative ${
                  isActive
                    ? "text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/10 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {/* Framer Motion Active Tab Slide Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-indigo-600 rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}

                {/* Animated Icon */}
                <motion.div 
                  variants={iconVariants[item.variantKey]} 
                  className="z-10 flex items-center justify-center"
                >
                  <Icon className="w-5 h-5" />
                </motion.div>

                {/* Label text */}
                <span className="z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Lower Settings / Actions */}
      <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/30 space-y-2">
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/10 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {isDark ? <Sun className="w-5 h-5 animate-spin-slow" /> : <Moon className="w-5 h-5" />}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </motion.button>

        {/* Logout */}
        <motion.button
          onClick={onLogout}
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </motion.button>
      </div>
    </aside>
  );
}
