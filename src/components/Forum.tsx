"use client";

import React, { useEffect, useState, useRef } from "react";
import { useCache } from "@/context/CacheContext";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  Plus, 
  MessageCircle, 
  User, 
  Clock, 
  X 
} from "lucide-react";

interface ForumProps {
  userId: string;
  username: string;
}

export default function Forum({ userId, username }: ForumProps) {
  const { cache, setCache, fetchGroups, fetchPosts } = useCache();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  
  // Modals / Inputs
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const supabase = createClient();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    if (selectedGroupId) {
      loadPosts(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);

      // --- Real-time Comments Sync Subscription ---
      const commentChannel = supabase
        .channel(`realtime-comments-${selectedPost.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "comments",
            filter: `post_id=eq.${selectedPost.id}`,
          },
          async (payload: any) => {
            // Fetch author username for the new comment payload
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", payload.new.author_id)
              .single();

            const fullComment = {
              ...payload.new,
              profiles: profile || { username: "Anonymous" },
            };

            setComments(prev => [...prev, fullComment]);
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(commentChannel);
      };
    }
  }, [selectedPost]);

  const loadData = async () => {
    const hasCache = cache.joinedGroups.length > 0;
    if (!hasCache) setLoading(true);

    try {
      const { joined } = await fetchGroups(userId);
      if (joined.length > 0 && !selectedGroupId) {
        setSelectedGroupId(joined[0].id);
      }
    } catch (err) {
      console.error("Forum groups cache fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (groupId: string) => {
    const hasCache = cache.posts[groupId] && cache.posts[groupId].length > 0;
    if (!hasCache) setLoading(true);

    try {
      await fetchPosts(groupId);
    } catch (err) {
      console.error("Forum posts cache fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data: commentsData, error } = await supabase
        .from("comments")
        .select("*, profiles(username)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(commentsData || []);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim() || !selectedGroupId) return;
    setPosting(true);

    try {
      const { data: newPost, error } = await supabase
        .from("posts")
        .insert({
          title: newPostTitle,
          content: newPostContent,
          group_id: selectedGroupId,
          author_id: userId,
        })
        .select("*, profiles(username)")
        .single();

      if (error) throw error;

      // Optimistic cache update
      const processedNewPost = { ...newPost, comment_count: 0 };
      const currentPosts = cache.posts[selectedGroupId] || [];
      setCache(prev => ({
        ...prev,
        posts: {
          ...prev.posts,
          [selectedGroupId]: [processedNewPost, ...currentPosts]
        }
      }));

      setNewPostTitle("");
      setNewPostContent("");
      setShowPostModal(false);

      // Reward points
      updateContributionScore(5);
    } catch (err) {
      console.error("Error creating post:", err);
    } finally {
      setPosting(false);
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPost) return;

    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          content: newCommentText,
          post_id: selectedPost.id,
          author_id: userId,
        });

      if (error) throw error;

      setNewCommentText("");

      // Update comment count in cache optimistically
      const currentPosts = cache.posts[selectedGroupId] || [];
      setCache(prev => ({
        ...prev,
        posts: {
          ...prev.posts,
          [selectedGroupId]: currentPosts.map(p =>
            p.id === selectedPost.id ? { ...p, comment_count: p.comment_count + 1 } : p
          )
        }
      }));

      // Reward points
      updateContributionScore(2);
    } catch (err) {
      console.error("Error sending comment:", err);
    }
  };

  const updateContributionScore = async (amount: number) => {
    if (!cache.profile) return;
    try {
      const nextScore = (cache.profile.contribution_score || 0) + amount;
      setCache(prev => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, contribution_score: nextScore } : null
      }));

      supabase
        .from("profiles")
        .update({ contribution_score: nextScore })
        .eq("id", userId)
        .then(({ error }: any) => {
          if (error) console.warn("Failed to sync comment score:", error.message);
        });
    } catch (err) {
      console.warn("Failed to update points:", err);
    }
  };

  const joinedGroups = cache.joinedGroups;
  const posts = cache.posts[selectedGroupId] || [];

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Stagger animations
  const listVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    hover: { y: -2, transition: { duration: 0.2 } }
  };

  const forumIconVariants: Record<string, any> = {
    message: {
      hover: { scale: 1.25, rotate: [0, -10, 10, 0], transition: { duration: 0.3 } }
    },
    user: {
      hover: { y: -2, scale: 1.15, transition: { duration: 0.2 } }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative min-h-screen pb-20">
      <AnimatePresence mode="wait">
        {selectedPost ? (
          /* --- Post Details View --- */
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Back Action */}
            <button
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Topics
            </button>

            {/* Post Header */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {selectedPost.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-4 border-b border-zinc-200/30 dark:border-zinc-800/30 pb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                  {selectedPost.profiles?.username?.charAt(0).toUpperCase() || "A"}
                </div>
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {selectedPost.profiles?.username || "Anonymous"}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{new Date(selectedPost.created_at).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-6 leading-relaxed whitespace-pre-wrap">
                {selectedPost.content}
              </p>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Discussion Replies ({comments.length})
              </h3>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No replies yet. Be the first to start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {comments.map(c => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 bg-zinc-500/5 flex gap-3 items-start"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold shrink-0">
                            {c.profiles?.username?.charAt(0).toUpperCase() || "A"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {c.profiles?.username || "Anonymous"}
                              </h4>
                              <span className="text-[10px] text-zinc-400">
                                {new Date(c.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                              {c.content}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>
            </div>

            {/* Send Comment Bar */}
            <form onSubmit={handleCreateComment} className="flex gap-3 items-center pt-2">
              <input
                type="text"
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder="Write a helpful response..."
                className="flex-1 px-4 py-3 bg-zinc-500/5 dark:bg-zinc-800/10 text-zinc-900 dark:text-zinc-100 border border-zinc-200/50 dark:border-zinc-800/30 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-500"
                required
              />
              <button
                type="submit"
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        ) : (
          /* --- Post List View --- */
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Collab Discussion Forum
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                  Post questions, explainers, or answer peers. Keep the hive learning!
                </p>
              </div>
              <button
                onClick={() => {
                  if (joinedGroups.length === 0) {
                    alert("Please join a study group collaborative first!");
                    return;
                  }
                  setShowPostModal(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Topic
              </button>
            </div>

            {/* Group Tab Switch */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Study Group:
              </span>
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="px-3 py-2 bg-zinc-500/5 dark:bg-zinc-800/10 text-zinc-900 dark:text-zinc-100 border border-zinc-200/50 dark:border-zinc-800/30 rounded-xl outline-none focus:border-indigo-500 text-sm cursor-pointer"
              >
                {joinedGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Posts list */}
            {posts.length === 0 ? (
              <div className="py-20 text-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-2xl">
                No discussions in this group yet. Be the first to post a topic!
              </div>
            ) : (
              <motion.div 
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {posts.map(post => (
                  <motion.div
                    key={post.id}
                    variants={cardVariants}
                    whileHover="hover"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedPost(post)}
                    className="glass-card p-5 cursor-pointer hover:border-indigo-500/30 transition-colors duration-300 flex flex-col justify-between min-h-[140px] group"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-500 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-200/30 dark:border-zinc-800/30 text-xs text-zinc-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <motion.div variants={forumIconVariants.user}>
                            <User className="w-4 h-4 text-indigo-500" />
                          </motion.div>
                          {post.profiles?.username || "Anonymous"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <span className="flex items-center gap-1.5 font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl">
                        <motion.div variants={forumIconVariants.message}>
                          <MessageCircle className="w-4 h-4" />
                        </motion.div>
                        {post.comment_count} replies
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Topic Modal */}
      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-md glass-card p-6 relative"
            >
              <button
                onClick={() => setShowPostModal(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
                Post Study Topic
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Create a new thread to request explanations, post review materials, or coordinate projects.
              </p>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Topic Title
                  </label>
                  <input
                    type="text"
                    value={newPostTitle}
                    onChange={e => setNewPostTitle(e.target.value)}
                    placeholder="e.g. Can someone clarify the chain rule for derivatives?"
                    className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Post Content
                  </label>
                  <textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="Detail your question or share your notes here..."
                    className="w-full px-4 py-2.5 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[120px] placeholder:text-zinc-600"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPostModal(false)}
                    className="flex-1 py-2.5 border border-zinc-700/50 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl transition-all cursor-pointer text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={posting}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all hover:shadow-md cursor-pointer text-sm flex items-center justify-center"
                  >
                    {posting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "Publish Post"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
