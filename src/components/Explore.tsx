"use client";

import React, { useEffect, useState } from "react";
import { useCache } from "@/context/CacheContext";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Users, BookOpen, X, Check } from "lucide-react";

interface ExploreProps {
  userId: string;
}

export default function Explore({ userId }: ExploreProps) {
  const { cache, setCache, fetchGroups } = useCache();
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    // If no cache yet, show loading spinner
    const hasCache = cache.groups.length > 0;
    if (!hasCache) setLoading(true);

    try {
      await fetchGroups(userId);
    } catch (err) {
      console.error("Explore cache fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeave = async (groupId: string) => {
    const isJoined = cache.joinedGroups.some(g => g.id === groupId);
    
    // Save old state for rollback
    const oldJoined = [...cache.joinedGroups];
    const oldGroups = [...cache.groups];

    // Optimistic Cache Update
    if (isJoined) {
      // Leave group (local state update)
      setCache(prev => {
        const nextJoined = prev.joinedGroups.filter(g => g.id !== groupId);
        const nextGroups = prev.groups.map(g =>
          g.id === groupId ? { ...g, member_count: Math.max(g.member_count - 1, 0) } : g
        );
        return { ...prev, joinedGroups: nextJoined, groups: nextGroups };
      });

      // Background DB Write
      try {
        const { error } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", userId);

        if (error) throw error;
      } catch (err: any) {
        console.error("Failed DB write (leave group), rolling back cache:", err);
        setCache(prev => ({ ...prev, joinedGroups: oldJoined, groups: oldGroups }));
        alert("Action failed: " + (err.message || "Permissions error"));
      }
    } else {
      // Join group (local state update)
      const targetGroup = cache.groups.find(g => g.id === groupId);
      if (targetGroup) {
        const updatedGroup = { ...targetGroup, member_count: targetGroup.member_count + 1 };
        setCache(prev => {
          const nextJoined = [...prev.joinedGroups, updatedGroup];
          const nextGroups = prev.groups.map(g => (g.id === groupId ? updatedGroup : g));
          return { ...prev, joinedGroups: nextJoined, groups: nextGroups };
        });
      }

      // Background DB Write
      try {
        const { error } = await supabase
          .from("group_members")
          .insert({ group_id: groupId, user_id: userId });

        if (error) throw error;
      } catch (err: any) {
        console.error("Failed DB write (join group), rolling back cache:", err);
        setCache(prev => ({ ...prev, joinedGroups: oldJoined, groups: oldGroups }));
        alert("Action failed: " + (err.message || "Permissions error"));
      }
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    try {
      const parsedTags = tagInput
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // 1. Insert Group in DB
      const { data: newGroup, error: groupErr } = await supabase
        .from("collaboratives")
        .insert({
          name,
          description,
          tags: parsedTags,
          created_by: userId,
        })
        .select()
        .single();

      if (groupErr) throw groupErr;

      // 2. Join Group in DB
      await supabase
        .from("group_members")
        .insert({ group_id: newGroup.id, user_id: userId });

      // 3. Update cache
      const processedNewGroup = { ...newGroup, member_count: 1 };
      setCache(prev => ({
        ...prev,
        groups: [processedNewGroup, ...prev.groups],
        joinedGroups: [...prev.joinedGroups, processedNewGroup],
      }));

      setName("");
      setDescription("");
      setTagInput("");
      setShowModal(false);
    } catch (err: any) {
      console.error("Failed to create collaborative group:", err);
      alert("Error building group: " + (err.message || "Check permissions/RLS"));
    } finally {
      setCreating(false);
    }
  };

  const handleLoadPresets = async () => {
    setSeeding(true);
    try {
      const presets = [
        {
          name: "🐍 Python Programming Bees",
          description: "A workspace for sharing Python scripts, reviewing algorithms, and working on coding assignments together.",
          tags: ["Coding", "Python", "Software"],
          created_by: userId
        },
        {
          name: "📐 Calculus Revision Squad",
          description: "Let's review derivatives, integration, limits, and practice previous years' exam papers.",
          tags: ["Math", "Calculus", "Exams"],
          created_by: userId
        },
        {
          name: "🔬 AI & Machine Learning Hub",
          description: "Discussion area for neural networks, deep learning, building models, and data science notebooks.",
          tags: ["AI", "DataScience", "Coding"],
          created_by: userId
        }
      ];

      const { error } = await supabase
        .from("collaboratives")
        .insert(presets);

      if (error) throw error;
      alert("Sample study groups loaded successfully! You can now join them.");
      
      // Force refresh cache
      await fetchGroups(userId, true);
    } catch (err: any) {
      console.error("Failed to seed sample groups:", err);
      alert("Seeding failed: " + (err.message || "Permissions error"));
    } finally {
      setSeeding(false);
    }
  };

  const groups = cache.groups;
  const joinedGroupIds = new Set(cache.joinedGroups.map(g => g.id));

  // Get unique tags
  const allTags = ["All", ...Array.from(new Set(groups.flatMap(g => g.tags || [])))];

  // Filter groups
  const filteredGroups = groups.filter(g => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === "All" || (g.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Stagger entry animations
  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
    hover: { y: -4, transition: { duration: 0.2 } }
  };

  const exploreIconVariants: Record<string, any> = {
    users: {
      hover: { scale: 1.25, rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }
    }
  };

  if (loading && groups.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative min-h-screen pb-20 overflow-hidden">
      {/* Decorative floating grids and particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-25">
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-10 right-20 w-72 h-72 rounded-full bg-cyan-500/5 blur-2xl"
        />
        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, 40, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-10 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl"
        />
      </div>

      <div className="relative z-10 space-y-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Explore Collaboratives
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Discover active study groups, subject circles, or build a new collaborative hub.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98] cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups by title or description..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-500/5 dark:bg-zinc-800/10 text-zinc-900 dark:text-zinc-100 border border-zinc-200/50 dark:border-zinc-800/30 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-500"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
          {allTags.slice(0, 8).map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                selectedTag === tag
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-zinc-500/5 border-zinc-200/50 dark:border-zinc-800/30 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/15"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Loader */}
      {filteredGroups.length === 0 ? (
        <div className="py-16 px-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center space-y-4">
          <motion.div
            animate={{ y: [0, -8, 0], scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="text-indigo-500"
          >
            <BookOpen className="w-10 h-10" />
          </motion.div>
          <div>
            <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200">No Collaboratives Found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Start by building your own custom study circle, or click below to populate the dashboard with default sample groups instantly!
            </p>
          </div>
          <button
            onClick={handleLoadPresets}
            disabled={seeding}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/15 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
          >
            {seeding ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Load Preset Sample Groups"
            )}
          </button>
        </div>
      ) : (
        /* Staggered Groups Grid */
        <motion.div 
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredGroups.map(group => {
            const isJoined = joinedGroupIds.has(group.id);
            return (
              <motion.div
                key={group.id}
                variants={cardVariants}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                className="glass-card p-6 flex flex-col justify-between glass-card-hover min-h-[220px]"
              >
                <div>
                  {/* Tags Row */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {group.tags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/15"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">
                    {group.name}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                    {group.description || "No description provided for this group."}
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/30">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                    <motion.div variants={exploreIconVariants.users}>
                      <Users className="w-4 h-4 text-indigo-500" />
                    </motion.div>
                    <span>{group.member_count} members</span>
                  </div>

                  <button
                    onClick={() => handleJoinLeave(group.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border ${
                      isJoined
                        ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
                        : "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/10"
                    }`}
                  >
                    {isJoined ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Joined
                      </>
                    ) : (
                      "Join Hive"
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Creation Modal zoom-in animation */}
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
                <BookOpen className="w-5 h-5 text-indigo-500" />
                New Collaborative Group
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Create a workspace for subject revision, team projects, or mutual topics.
              </p>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Calculus Revision Squad"
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
                    placeholder="Describe focus topics, study times, or tasks..."
                    className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[80px] placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    placeholder="e.g. Math, Exams, Year1"
                    className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-600"
                  />
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
                      "Build Hive"
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
