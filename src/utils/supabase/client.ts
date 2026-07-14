import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    // Return a dummy client proxy to prevent crashes during initial rendering or query calls.
    return new Proxy({} as any, {
      get(target, prop) {
        if (prop === "auth") {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getUser: async () => ({ data: { user: null }, error: null }),
            signInWithPassword: async () => ({ data: {}, error: new Error("Supabase is not configured") }),
            signUp: async () => ({ data: {}, error: new Error("Supabase is not configured") }),
            signOut: async () => ({ error: null }),
          };
        }
        // Return dummy builders for database queries so chain methods do not fail
        return () => ({
          select: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
              then: (resolve: any) => resolve({ data: [], error: null }),
            }),
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
              then: (resolve: any) => resolve({ data: null, error: null }),
            }),
            then: (resolve: any) => resolve({ data: [], error: null }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
              then: (resolve: any) => resolve({ data: null, error: null }),
            }),
            then: (resolve: any) => resolve({ data: null, error: null }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: null, error: null }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: null, error: null }),
          }),
          channel: () => ({
            on: () => ({
              subscribe: () => ({ unsubscribe: () => {} }),
            }),
          }),
          then: (resolve: any) => resolve({ data: [], error: null }),
        });
      }
    });
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
};
