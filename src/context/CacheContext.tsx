"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

interface CacheState {
  profile: any | null;
  tasks: any[];
  groups: any[];
  joinedGroups: any[];
  resources: any[];
  posts: { [groupId: string]: any[] };
  announcement: any | null;
}

interface CacheContextType {
  cache: CacheState;
  setCache: React.Dispatch<React.SetStateAction<CacheState>>;
  fetchProfile: (uid: string, force?: boolean) => Promise<any>;
  fetchTasks: (uid: string, groupIds: string[], force?: boolean) => Promise<any[]>;
  fetchGroups: (uid: string, force?: boolean) => Promise<{ groups: any[]; joined: any[] }>;
  fetchResources: (groupIds: string[], force?: boolean) => Promise<any[]>;
  fetchPosts: (groupId: string, force?: boolean) => Promise<any[]>;
  clearCache: () => void;
}

const initialCache: CacheState = {
  profile: null,
  tasks: [],
  groups: [],
  joinedGroups: [],
  resources: [],
  posts: {},
  announcement: null,
};

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export function CacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<CacheState>(initialCache);
  const supabase = createClient();

  const clearCache = () => setCache(initialCache);

  // 1. Fetch Profile (Stale-While-Revalidate)
  const fetchProfile = async (uid: string, force = false) => {
    if (!isSupabaseConfigured) {
      return cache.profile;
    }
    // If cached, return immediately, fetch in background
    if (cache.profile && !force) {
      // Async revalidate in background
      supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single()
        .then(({ data }: any) => {
          if (data) setCache(prev => ({ ...prev, profile: data }));
        });
      return cache.profile;
    }

    // Otherwise, fetch synchronously
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          // Auto-recovery fallback for missing profile rows
          const { data: { user } } = await supabase.auth.getUser();
          const username = user?.user_metadata?.username || user?.email?.split("@")[0] || "Scholar";
          const role = user?.user_metadata?.role || "student";
          
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: uid,
              username,
              role,
              contribution_score: 0,
              focus_minutes: 0
            })
            .select()
            .single();
            
          if (createError) throw createError;
          setCache(prev => ({ ...prev, profile: newProfile }));
          return newProfile;
        }
        throw error;
      }
      setCache(prev => ({ ...prev, profile: data }));
      return data;
    } catch (err) {
      console.error("Cache profile fetch error:", err);
      return null;
    }
  };

  // 2. Fetch Tasks (SWR)
  const fetchTasks = async (uid: string, groupIds: string[], force = false) => {
    if (!isSupabaseConfigured) {
      return cache.tasks;
    }
    const runQuery = async () => {
      let query = supabase
        .from("tasks")
        .select("*, collaboratives(name), profiles(username)");

      if (groupIds.length > 0) {
        query = query.or(`group_id.in.(${groupIds.join(",")}),assigned_to.eq.${uid}`);
      } else {
        query = query.eq("assigned_to", uid);
      }

      const { data } = await query;
      if (data) setCache(prev => ({ ...prev, tasks: data }));
      return data || [];
    };

    if (cache.tasks.length > 0 && !force) {
      runQuery(); // Background refresh
      return cache.tasks;
    }

    return await runQuery();
  };

  // 3. Fetch Groups Directory (SWR)
  const fetchGroups = async (uid: string, force = false) => {
    if (!isSupabaseConfigured) {
      return { groups: cache.groups, joined: cache.joinedGroups };
    }
    const runQuery = async () => {
      // Fetch collaboratives
      const { data: collabData } = await supabase
        .from("collaboratives")
        .select("*")
        .order("created_at", { ascending: false });

      // Fetch memberships
      const { data: memberData } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", uid);

      // Fetch member counts
      const { data: countsData } = await supabase
        .from("group_members")
        .select("group_id");

      const countsMap: { [key: string]: number } = {};
      countsData?.forEach((m: any) => {
        countsMap[m.group_id] = (countsMap[m.group_id] || 0) + 1;
      });

      const joinedSet = new Set<string>(memberData?.map((m: any) => m.group_id) || []);
      const processedGroups = collabData?.map((g: any) => ({
        ...g,
        member_count: countsMap[g.id] || 0,
      })) || [];

      const joinedGroupsList = processedGroups.filter((g: any) => joinedSet.has(g.id));

      setCache(prev => ({
        ...prev,
        groups: processedGroups,
        joinedGroups: joinedGroupsList,
      }));

      return { groups: processedGroups, joined: joinedGroupsList };
    };

    if (cache.groups.length > 0 && !force) {
      runQuery(); // Background refresh
      return { groups: cache.groups, joined: cache.joinedGroups };
    }

    return await runQuery();
  };

  // 4. Fetch Resources (SWR)
  const fetchResources = async (groupIds: string[], force = false) => {
    if (!isSupabaseConfigured) {
      return cache.resources;
    }
    const runQuery = async () => {
      let query = supabase
        .from("resources")
        .select("*, profiles(username)");

      if (groupIds.length > 0) {
        query = query.in("group_id", groupIds);
      } else {
        query = query.is("group_id", null);
      }

      const { data } = await query.order("created_at", { ascending: false });
      if (data) setCache(prev => ({ ...prev, resources: data }));
      return data || [];
    };

    if (cache.resources.length > 0 && !force) {
      runQuery(); // Background refresh
      return cache.resources;
    }

    return await runQuery();
  };

  // 5. Fetch Forum Posts (SWR per Group)
  const fetchPosts = async (groupId: string, force = false) => {
    if (!isSupabaseConfigured) {
      return cache.posts[groupId] || [];
    }
    const runQuery = async () => {
      const { data: postsData } = await supabase
        .from("posts")
        .select("*, profiles(username)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      const { data: commentCounts } = await supabase
        .from("comments")
        .select("post_id");

      const countsMap: { [key: string]: number } = {};
      commentCounts?.forEach((c: any) => {
        countsMap[c.post_id] = (countsMap[c.post_id] || 0) + 1;
      });

      const processedPosts = postsData?.map((p: any) => ({
        ...p,
        comment_count: countsMap[p.id] || 0,
      })) || [];

      setCache(prev => ({
        ...prev,
        posts: { ...prev.posts, [groupId]: processedPosts },
      }));

      return processedPosts;
    };

    if (cache.posts[groupId] && !force) {
      runQuery(); // Background refresh
      return cache.posts[groupId];
    }

    return await runQuery();
  };

  return (
    <CacheContext.Provider
      value={{
        cache,
        setCache,
        fetchProfile,
        fetchTasks,
        fetchGroups,
        fetchResources,
        fetchPosts,
        clearCache,
      }}
    >
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error("useCache must be used within a CacheProvider");
  }
  return context;
}
