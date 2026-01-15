"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Check for error in URL params (from OAuth callback)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        // Clean up URL by removing error param
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('error');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;

        if (data.user) {
          // Check if email confirmation is required
          if (data.user.identities && data.user.identities.length === 0) {
            setError("This email is already registered. Please log in instead.");
            setIsSignUp(false);
          } else {
            router.push("/dashboard");
            router.refresh();
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Session persistence is handled by cookie settings in middleware and server.ts
          // When rememberMe is true, cookies are set with 30-day expiration
          // When false, cookies use default session expiration
          
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      // User will be redirected to Google
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Guest login: Failed to parse response', jsonError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('Guest login: API error', response.status, data);
        throw new Error(data?.error || `Failed to create guest session (${response.status})`);
      }

      // Refresh to get the new session
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Guest login error:', err);
      setError(err.message || "An error occurred. Please check if anonymous authentication is enabled in Supabase.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl font-bold font-mono mb-2"
          >
            traceIt<span className="text-primary">.</span>
          </motion.h1>
          <p className="text-muted-foreground text-sm">
            Track your attendance. Simple as that.
          </p>
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-bold font-mono mb-6 text-center">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-sm font-mono text-muted-foreground mb-2 block uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-muted rounded-lg pl-10 pr-4 py-3 text-sm border border-border focus:border-primary focus:outline-none transition-colors"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-mono text-muted-foreground mb-2 block uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-muted rounded-lg pl-10 pr-4 py-3 text-sm border border-border focus:border-primary focus:outline-none transition-colors"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              {isSignUp && (
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {/* Remember Me */}
            {!isSignUp && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  disabled={loading}
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Remember me
                </label>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full gap-2 font-mono"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Account
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </>
                  )}
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full gap-2 font-mono"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? "Connecting..." : "Google"}
          </Button>

          {/* Guest Login */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full gap-2 font-mono"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Continue as Guest
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Try without signing up. Data will be temporary.
            </p>
          </div>

          {/* Toggle Sign Up / Login */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <span className="text-primary font-semibold">Sign In</span>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <span className="text-primary font-semibold">Sign Up</span>
                </>
              )}
            </button>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
