"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, User, LogOut, ChevronDown, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function ProfileDropdown() {
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  // Get user email
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || "");
      }
    });
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleResetTimetable = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/reset', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to reset timetable');

      window.location.href = '/dashboard/create-timetable';
    } catch (error) {
      console.error('Error resetting timetable:', error);
      alert('Failed to reset timetable. Please try again.');
    } finally {
      setLoading(false);
      setShowResetConfirm(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await fetch('/api/user/reset', { method: 'DELETE' });
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 h-9 px-3"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden md:inline text-xs font-mono">Settings</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsOpen(false);
                setShowResetConfirm(false);
                setShowDeleteConfirm(false);
              }}
            />

            {/* Dropdown Card */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">Account</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{userEmail}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start gap-3 h-9 px-3 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </Button>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-border bg-error/5">
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-error" />
                    <span className="text-xs font-mono uppercase tracking-wider text-error">Danger Zone</span>
                  </div>

                  {/* Reset Timetable */}
                  <div className="space-y-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowResetConfirm(!showResetConfirm)}
                      className="w-full justify-start gap-3 h-9 px-3 text-warning hover:text-warning hover:bg-warning/10"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">Reset Timetable</span>
                    </Button>

                    <AnimatePresence mode="wait">
                      {showResetConfirm && (
                        <motion.div
                          initial={{ opacity: 0, scaleY: 0, originY: 0 }}
                          animate={{ 
                            opacity: 1, 
                            scaleY: 1,
                            transition: {
                              duration: 0.2,
                              ease: [0.4, 0, 0.2, 1]
                            }
                          }}
                          exit={{ 
                            opacity: 0, 
                            scaleY: 0,
                            transition: {
                              duration: 0.15,
                              ease: [0.4, 0, 1, 1]
                            }
                          }}
                          className="px-3 py-2 bg-warning/10 border border-warning rounded text-xs text-warning overflow-hidden will-change-transform"
                          style={{ transformOrigin: 'top' }}
                        >
                          <p className="mb-2">Delete all timetables & data?</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowResetConfirm(false)}
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleResetTimetable}
                              disabled={loading}
                              className="h-7 text-xs bg-warning text-black hover:bg-warning/90"
                            >
                              {loading ? 'Resetting...' : 'Confirm'}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Delete Account */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                      className="w-full justify-start gap-3 h-9 px-3 text-error hover:text-error hover:bg-error/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Delete Account</span>
                    </Button>

                    <AnimatePresence mode="wait">
                      {showDeleteConfirm && (
                        <motion.div
                          initial={{ opacity: 0, scaleY: 0, originY: 0 }}
                          animate={{ 
                            opacity: 1, 
                            scaleY: 1,
                            transition: {
                              duration: 0.2,
                              ease: [0.4, 0, 0.2, 1]
                            }
                          }}
                          exit={{ 
                            opacity: 0, 
                            scaleY: 0,
                            transition: {
                              duration: 0.15,
                              ease: [0.4, 0, 1, 1]
                            }
                          }}
                          className="px-3 py-2 bg-error/10 border border-error rounded text-xs text-error overflow-hidden will-change-transform"
                          style={{ transformOrigin: 'top' }}
                        >
                          <p className="mb-2">Permanently delete account?</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowDeleteConfirm(false)}
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleDeleteAccount}
                              disabled={loading}
                              className="h-7 text-xs bg-error text-white hover:bg-error/90"
                            >
                              {loading ? 'Deleting...' : 'Confirm'}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
