"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { 
  ShieldAlert, 
  Users, 
  BookOpen, 
  MessageSquare, 
  Trash2, 
  UserMinus, 
  Shield, 
  ShieldAlert as ShieldIcon,
  Megaphone,
  CheckCircle,
  FileText
} from "lucide-react";

interface AdminPanelProps {
  userId: string;
}

export default function AdminPanel({ userId }: AdminPanelProps) {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentResources, setRecentResources] = useState<any[]>([]);
  const [stats, setStats] = useState({
    users: 0,
    groups: 0,
    posts: 0,
    resources: 0,
  });

  // Announcements state
  const [announcement, setAnnouncement] = useState("");
  const [sendingAnnounce, setSendingAnnounce] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const adminIconVariants: Record<string, any> = {
    users: {
      hover: { scale: 1.25, rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }
    },
    groups: {
      hover: { y: [0, -4, 2, -4, 0], scale: 1.2, transition: { duration: 0.5 } }
    },
    posts: {
      hover: { rotate: 360, transition: { duration: 0.6 } }
    },
    resources: {
      hover: { x: [0, -3, 3, -3, 3, 0], transition: { duration: 0.4 } }
    }
  };

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
    hover: { y: -3, transition: { duration: 0.2 } }
  };

  useEffect(() => {
    fetchAdminData();
  }, [userId]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("username", { ascending: true });
      setUsersList(usersData || []);

      // 2. Fetch Recent Posts for Moderation
      const { data: postsData } = await supabase
        .from("posts")
        .select("*, profiles(username), collaboratives(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentPosts(postsData || []);

      // 3. Fetch Recent Resources for Moderation
      const { data: resourcesData } = await supabase
        .from("resources")
        .select("*, profiles(username), collaboratives(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentResources(resourcesData || []);

      // 4. Fetch group counts
      const { data: groupsData } = await supabase
        .from("collaboratives")
        .select("id");

      // Calculate totals
      setStats({
        users: usersData?.length || 0,
        groups: groupsData?.length || 0,
        posts: postsData?.length || 0,
        resources: resourcesData?.length || 0,
      });

    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.trim()) return;
    setSendingAnnounce(true);
    setAnnounceMsg("");

    try {
      const { error } = await supabase
        .from("announcements")
        .insert({
          content: announcement,
          created_by: userId,
        });

      if (error) throw error;

      setAnnouncement("");
      setAnnounceMsg("Announcement broadcasted successfully! All students will see this banner.");
      setTimeout(() => setAnnounceMsg(""), 5000);
    } catch (err) {
      console.error("Error creating announcement:", err);
    } finally {
      setSendingAnnounce(false);
    }
  };

  const handleToggleUserRole = async (targetUserId: string, currentRole: string) => {
    const nextRole = currentRole === "admin" ? "student" : "admin";
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: nextRole })
        .eq("id", targetUserId);

      if (error) throw error;

      setUsersList(prev =>
        prev.map(u => (u.id === targetUserId ? { ...u, role: nextRole } : u))
      );
    } catch (err) {
      console.error("Failed to update user role:", err);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!confirm("Are you sure you want to delete this user? All their data will be removed.")) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", targetUserId);

      if (error) throw error;

      setUsersList(prev => prev.filter(u => u.id !== targetUserId));
      setStats(prev => ({ ...prev, users: Math.max(prev.users - 1, 0) }));
    } catch (err) {
      console.error("Failed to delete user profile:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this discussion thread?")) return;
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setRecentPosts(prev => prev.filter(p => p.id !== postId));
      setStats(prev => ({ ...prev, posts: Math.max(prev.posts - 1, 0) }));
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const handleDeleteResource = async (resId: string) => {
    if (!confirm("Delete this bookmark link?")) return;
    try {
      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", resId);

      if (error) throw error;

      setRecentResources(prev => prev.filter(r => r.id !== resId));
      setStats(prev => ({ ...prev, resources: Math.max(prev.resources - 1, 0) }));
    } catch (err) {
      console.error("Error deleting resource:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative min-h-screen pb-20 overflow-hidden z-10">
      {/* Dynamic Admin Panel Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-30 dark:opacity-20">
        <motion.div
          animate={{
            x: [0, -30, 30, 0],
            y: [0, 40, -40, 0],
            scale: [1, 1.1, 0.95, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-rose-500/5 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 40, -40, 0],
            y: [0, -50, 50, 0],
            scale: [1, 0.9, 1.15, 1]
          }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/5 blur-[120px]"
        />
      </div>

      <div className="relative z-10 space-y-8">
        {/* Header Info */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="flex items-center justify-center"
            >
              <ShieldAlert className="w-8 h-8 text-rose-500" />
            </motion.div>
            Admin Control Center
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Monitor platform metrics, manage user roles, write announcements, and moderate student content.
          </p>
        </div>

      {/* Stats Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10"
      >
        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-indigo-500/30 hover:shadow-indigo-500/5 hover:shadow-lg transition-colors duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 text-indigo-500">
            <motion.div variants={adminIconVariants.users}>
              <Users className="w-5 h-5" />
            </motion.div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">Total Scholars</span>
            <h4 className="text-xl font-bold mt-0.5 text-zinc-900 dark:text-white">{stats.users}</h4>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-cyan-500/30 hover:shadow-cyan-500/5 hover:shadow-lg transition-colors duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-600/10 flex items-center justify-center border border-cyan-500/20 text-cyan-500">
            <motion.div variants={adminIconVariants.groups}>
              <BookOpen className="w-5 h-5" />
            </motion.div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">Study Groups</span>
            <h4 className="text-xl font-bold mt-0.5 text-zinc-900 dark:text-white">{stats.groups}</h4>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-emerald-500/30 hover:shadow-emerald-500/5 hover:shadow-lg transition-colors duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
            <motion.div variants={adminIconVariants.posts}>
              <MessageSquare className="w-5 h-5" />
            </motion.div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">Forum Posts</span>
            <h4 className="text-xl font-bold mt-0.5 text-zinc-900 dark:text-white">{stats.posts}</h4>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-amber-500/30 hover:shadow-amber-500/5 hover:shadow-lg transition-colors duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
            <motion.div variants={adminIconVariants.resources}>
              <FileText className="w-5 h-5" />
            </motion.div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">Shared Links</span>
            <h4 className="text-xl font-bold mt-0.5 text-zinc-900 dark:text-white">{stats.resources}</h4>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Grid: User Management vs Broadcast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Management Table */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between min-h-[400px]">
          <div>
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Member Directory
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200/50 dark:border-zinc-800/30 text-xs font-semibold text-zinc-400 uppercase">
                    <th className="pb-3">Username</th>
                    <th className="pb-3">Current Role</th>
                    <th className="pb-3">Hours Focus</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/10">
                  {usersList.map(user => (
                    <tr key={user.id} className="hover:bg-zinc-500/5 transition-colors">
                      <td className="py-3 font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        {user.username}
                      </td>
                      <td className="py-3">
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                          user.role === "admin"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/15"
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/15"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-zinc-400">
                        {Math.round((user.focus_minutes || 0) / 60)} hrs
                      </td>
                      <td className="py-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleToggleUserRole(user.id, user.role)}
                          className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer inline-block"
                          title="Toggle Role"
                          disabled={user.id === userId} // Prevent self demotion
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer inline-block"
                          title="Remove User"
                          disabled={user.id === userId}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Global Announcement Creator */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-500" />
              Hive Broadcast
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Write a system-wide announcement card that displays instantly to all active student dashboard panels.
            </p>

            {announceMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs mb-4 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{announceMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Message Banner
                </label>
                <textarea
                  value={announcement}
                  onChange={e => setAnnouncement(e.target.value)}
                  placeholder="e.g. Schedule Maintenance at 8 PM, platform services will be down for 10m."
                  className="w-full px-4 py-3 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[120px] text-sm placeholder:text-zinc-600"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sendingAnnounce}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-rose-600/15 active:scale-95 cursor-pointer flex items-center justify-center"
              >
                {sendingAnnounce ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Broadcast Banner"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Moderation Controls: Recent Forum and Recent Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moderate Discussions */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <ShieldIcon className="w-5 h-5 text-rose-500" />
            Moderate Discussions
          </h3>
          <div className="space-y-3">
            {recentPosts.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs">No posts to moderate</div>
            ) : (
              recentPosts.map(post => (
                <div key={post.id} className="p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/20 bg-zinc-500/5 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-4">
                    <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{post.title}</h4>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      Posted by {post.profiles?.username || "Anon"} in {post.collaboratives?.name || "Hive"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Moderate Resources */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <ShieldIcon className="w-5 h-5 text-rose-500" />
            Moderate Shared Links
          </h3>
          <div className="space-y-3">
            {recentResources.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs">No links to moderate</div>
            ) : (
              recentResources.map(res => (
                <div key={res.id} className="p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/20 bg-zinc-500/5 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-4">
                    <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{res.title}</h4>
                    <a href={res.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline truncate block">{res.url}</a>
                  </div>
                  <button
                    onClick={() => handleDeleteResource(res.id)}
                    className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
