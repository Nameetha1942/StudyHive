"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Eye, EyeOff, User, Mail, Lock, Shield, Sparkles } from "lucide-react";

interface AuthScreenProps {
  onSessionActive: () => void;
}

export default function AuthScreen({ onSessionActive }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"student" | "admin">("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        setMessage({ text: "Success! Logging you in...", type: "success" });
        setTimeout(() => {
          onSessionActive();
        }, 1000);
      } else {
        // Sign Up
        if (!username.trim()) {
          throw new Error("Username is required");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              role,
            },
          },
        });

        if (error) throw error;

        // Note: With Supabase trigger, profiles table will automatically get populated.
        // In case trigger is not set up, we also perform a manual insertion/fallback in client.
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              username,
              role,
              contribution_score: 0,
              focus_minutes: 0,
            });
          
          if (profileError) {
            console.warn("Profiles auto-insert failed (might be handled by trigger):", profileError.message);
          }
        }

        setMessage({
          text: "Registration successful! You can now log in.",
          type: "success",
        });
        setIsLogin(true);
      }
    } catch (err: any) {
      setMessage({ text: err.message || "An authentication error occurred", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 transition-colors duration-500 login-bg dark:login-bg">
      <div className="w-full max-w-md glass-card p-8 relative overflow-hidden group">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl group-hover:bg-indigo-500/30 transition-all duration-700"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl group-hover:bg-cyan-500/30 transition-all duration-700"></div>

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 mb-4 shadow-inner text-indigo-500 dark:text-indigo-400">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            StudyHive
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {isLogin
              ? "Welcome back, scholar! Please sign in to enter the hive."
              : "Create an account to start collaborating with peers."}
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-3 rounded-lg mb-6 text-sm flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
            }`}
          >
            <span className="font-semibold">
              {message.type === "success" ? "✓" : "⚠"}
            </span>
            <span>{message.text}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-5 relative z-10">
          {!isLogin && (
            <>
              {/* Username field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your nickname"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-500"
                    required={!isLogin}
                  />
                </div>
              </div>

              {/* Role selector field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Select Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      role === "student"
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold shadow-lg shadow-indigo-600/10"
                        : "bg-zinc-900/40 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      role === "admin"
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold shadow-lg shadow-indigo-600/10"
                        : "bg-zinc-900/40 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Email field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full pl-10 pr-4 py-3 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-500"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-zinc-900/40 text-zinc-100 border border-zinc-700/50 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer mt-6 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isLogin ? (
              "Sign In to Platform"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 text-center text-sm text-zinc-400 relative z-10">
          {isLogin ? (
            <p>
              New to the platform?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setMessage(null);
                }}
                className="text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setMessage(null);
                }}
                className="text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                Sign in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
