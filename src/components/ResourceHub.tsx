"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  FolderPlus, 
  Link2, 
  ExternalLink, 
  Trash2, 
  Plus, 
  User, 
  X,
  FileText
} from "lucide-react";

interface ResourceHubProps {
  userId: string;
}

export default function ResourceHub({ userId }: ResourceHubProps) {
  const [resources, setResources] = useState<any[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("All");
  
  // Modals & form input
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("general");
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, [userId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // 1. Fetch joined collaboratives
      const { data: memberData } = await supabase
        .from("group_members")
        .select("group_id, collaboratives(*)")
        .eq("user_id", userId);

      if (memberData) {
        const groups = memberData.map((m: any) => m.collaboratives).filter(Boolean);
        setJoinedGroups(groups);
        if (groups.length > 0) {
          setGroupId(groups[0].id);
        }
      }

      // 2. Fetch all shared resources in user's groups
      const groupIds = memberData?.map((m: any) => m.group_id) || [];

      let query = supabase
        .from("resources")
        .select("*, profiles(username)");

      if (groupIds.length > 0) {
        query = query.in("group_id", groupIds);
      } else {
        // Fallback: if user hasn't joined any groups, they can see general public resources
        query = query.is("group_id", null);
      }

      const { data: resData, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setResources(resData || []);
    } catch (err) {
      console.error("Error fetching resources:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShareResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim() || !groupId) return;
    setSharing(true);

    try {
      // Basic URL verification helper
      let formattedUrl = url;
      if (!/^https?:\/\//i.test(url)) {
        formattedUrl = `https://${url}`;
      }

      const { data: newRes, error } = await supabase
        .from("resources")
        .insert({
          title,
          url: formattedUrl,
          category,
          group_id: groupId,
          shared_by: userId,
        })
        .select("*, profiles(username)")
        .single();

      if (error) throw error;

      setResources(prev => [newRes, ...prev]);
      setTitle("");
      setUrl("");
      setCategory("general");
      setShowModal(false);

      // Reward points
      updateContributionScore(3);
    } catch (err) {
      console.error("Error sharing resource:", err);
    } finally {
      setSharing(false);
    }
  };

  const deleteResource = async (resId: string) => {
    try {
      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", resId);

      if (error) throw error;

      setResources(prev => prev.filter(r => r.id !== resId));
    } catch (err) {
      console.error("Failed to delete resource:", err);
    }
  };

  const updateContributionScore = async (amount: number) => {
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("contribution_score")
        .eq("id", userId)
        .single();
      const current = prof?.contribution_score || 0;
      await supabase
        .from("profiles")
        .update({ contribution_score: current + amount })
        .eq("id", userId);
    } catch (err) {
      console.warn("Failed to update points:", err);
    }
  };

  const filteredResources = resources.filter(r => {
    return selectedGroupId === "All" || r.group_id === selectedGroupId;
  });

  return (
    <div className="space-y-8 animate-fade-in relative min-h-screen pb-20">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Resource Sharing Hub
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Pin useful study drives, links, GitHub repos, or lecture slide bookmarks.
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
          Share Resource
        </button>
      </div>

      {/* Filter and Select Grid */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Filter Group:
        </span>
        <select
          value={selectedGroupId}
          onChange={e => setSelectedGroupId(e.target.value)}
          className="px-3 py-2 bg-zinc-500/5 dark:bg-zinc-800/10 text-zinc-900 dark:text-zinc-100 border border-zinc-200/50 dark:border-zinc-800/30 rounded-xl outline-none focus:border-indigo-500 text-sm cursor-pointer"
        >
          <option value="All">All Groups</option>
          {joinedGroups.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {/* Resource Cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="py-20 text-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-2xl">
          No resources shared in this category yet. Click Share Resource to start!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(res => (
            <div
              key={res.id}
              className="glass-card p-5 flex flex-col justify-between glass-card-hover group min-h-[160px]"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400">
                    {res.category}
                  </span>
                  {res.shared_by === userId && (
                    <button
                      onClick={() => deleteResource(res.id)}
                      className="text-zinc-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2.5 items-start">
                  <div className="w-8 h-8 rounded-lg bg-zinc-500/10 flex items-center justify-center shrink-0 text-indigo-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 line-clamp-1">
                      {res.title}
                    </h3>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mt-1 truncate max-w-[200px]"
                    >
                      <Link2 className="w-3.5 h-3.5 shrink-0" />
                      {res.url}
                    </a>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex justify-between items-center mt-6 pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30 text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-indigo-500" />
                  Shared by {res.profiles?.username || "Anonymous"}
                </span>

                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-zinc-500/10 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-1 transition-colors"
                >
                  Visit <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md glass-card p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-500" />
              Share Resource
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Distribute external document folders, notes URLs, or tools to your peer group.
            </p>

            <form onSubmit={handleShareResource} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Resource Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Unit 3 Biology Notes Drive"
                  className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-600"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Link URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Category Tag
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  >
                    <option value="notes">Notes/PDFs</option>
                    <option value="website">Websites</option>
                    <option value="code">Coding Repository</option>
                    <option value="video">Video Guides</option>
                    <option value="general">General Link</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Study Group
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
                  disabled={sharing}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all hover:shadow-md cursor-pointer text-sm flex items-center justify-center"
                >
                  {sharing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Share Link"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
