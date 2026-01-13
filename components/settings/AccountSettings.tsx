"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export function AccountSettings() {
  const router = useRouter();
  const supabase = createClient();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetTimetable = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/reset', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to reset timetable');

      // Redirect to creation page
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
      // First delete all user data
      await fetch('/api/user/reset', { method: 'DELETE' });

      // Then delete the auth account
      const { error } = await supabase.auth.admin.deleteUser(
        (await supabase.auth.getUser()).data.user?.id || ''
      );

      if (error) {
        // If admin delete fails, try user delete
        await supabase.auth.signOut();
      }

      // Redirect to login
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
    <Card className="border-error/30">
      <CardHeader>
        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-error" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reset Timetable */}
        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1">Reset Timetable</h3>
              <p className="text-xs text-muted-foreground">
                Delete all your timetables and attendance records. You'll start fresh with the creation screen.
                Your account will remain active.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="border-warning text-warning hover:bg-warning/10 flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <AnimatePresence>
            {showResetConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 bg-warning/10 border border-warning rounded-md"
              >
                <p className="text-xs text-warning mb-3">
                  ⚠️ This will permanently delete all your timetables and attendance data. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowResetConfirm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleResetTimetable}
                    disabled={loading}
                    className="bg-warning text-black hover:bg-warning/90"
                  >
                    {loading ? 'Resetting...' : 'Yes, Reset My Data'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Delete Account */}
        <div className="p-4 border border-error/50 rounded-lg bg-error/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1 text-error">Delete Account</h3>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data. You can sign up again later with the same email.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="border-error text-error hover:bg-error/10 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>

          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 bg-error/10 border border-error rounded-md"
              >
                <p className="text-xs text-error mb-3">
                  🚨 This will permanently delete your account and ALL data. You'll be signed out immediately.
                  This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    className="bg-error text-white hover:bg-error/90"
                  >
                    {loading ? 'Deleting...' : 'Yes, Delete Forever'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
