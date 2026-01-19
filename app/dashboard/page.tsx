"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, TrendingUp, AlertCircle, CalendarDays, Loader2, Menu, PanelLeftClose, PanelLeftOpen, Sparkles, UserPlus, RefreshCw } from "lucide-react";
import { addWeeks, subWeeks, startOfWeek, format } from "date-fns";
import { WeekSelector } from "@/components/dashboard/WeekSelector";
import { TimetableHeader } from "@/components/dashboard/TimetableHeader";
import { TimetableGrid } from "@/components/dashboard/TimetableGrid";
import { AnalyticsSection } from "@/components/analytics/AnalyticsSection";
import { AttendanceWrapped } from "@/components/analytics/AttendanceWrapped";
import { ResizableAIPanel } from "@/components/dashboard/ResizableAIPanel";
import { ResizableLeftPanel } from "@/components/dashboard/ResizableLeftPanel";
import { AIChatPanel } from "@/components/dashboard/AIChatPanel";
import { SemesterInfo } from "@/components/dashboard/SemesterInfo";
import { AttendanceSettings } from "@/components/settings/AttendanceSettings";
import { BulkMarkingDialog } from "@/components/dashboard/BulkMarkingDialog";
import { ProfileDropdown } from "@/components/dashboard/ProfileDropdown";
import { Button } from "@/components/ui/button";
import { calculateAttendanceStats } from "@/lib/attendance-calculator";
import { Timetable, UserSettings } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { usePageView, trackFeature } from "@/hooks/useAnalytics";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // UI State
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isMobileLeftPanelOpen, setIsMobileLeftPanelOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false); // Default closed for mobile-first
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isBulkMarkingOpen, setIsBulkMarkingOpen] = useState(false);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  // Open AI panel on desktop by default
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsAIPanelOpen(true);
    }
  }, []);
  
  // Data State
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showGuestBanner, setShowGuestBanner] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    targetPercentage: 75,
    countMassBunkAs: "absent",
    countTeacherAbsentAs: "attended",
    showAnalytics: true,
    includeLabsInOverall: true,
    invertedMode: false,
  });
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, string>>(new Map());
  
  // Check auth and fetch data on mount
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        // Get user email and check if guest
        if (session.user?.email) {
          setUserEmail(session.user.email);
        }
        
        // Check if user is a guest
        const guestStatus = session.user?.user_metadata?.is_guest || false;
        setIsGuest(guestStatus);
        setShowGuestBanner(guestStatus);
        
        // Fetch timetable
        const ttResponse = await fetch('/api/timetable');
        const ttData = await ttResponse.json();
        
        if (ttData.error === 'Unauthorized') {
          router.push('/auth/login');
          return;
        }
        
        if (!ttData.timetable) {
          // No timetable found, redirect to create
          router.push('/dashboard/create-timetable');
          return;
        }
        
        setTimetable(ttData.timetable);
        
        // Fetch attendance
        const attResponse = await fetch(`/api/attendance?timetableId=${ttData.timetable.id}`);
        const attData = await attResponse.json();
        setAttendanceRecords(new Map(Object.entries(attData.records || {})));
        
        // Fetch settings
        const settingsResponse = await fetch('/api/settings');
        const settingsData = await settingsResponse.json();
        setSettings({
          ...settingsData.settings,
          invertedMode: settingsData.settings.invertedMode ?? false,
        });
        
      } catch (error) {
        console.error('Error fetching data:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndFetchData();
  }, [router, supabase]);
  
  // Semester dates
  const semesterStart = timetable ? new Date(timetable.startDate) : new Date();
  const semesterEnd = timetable ? new Date(timetable.endDate) : new Date();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Calculate analytics dynamically
  const analytics = useMemo(() => {
    if (!timetable || timetable.slots.length === 0) {
      return { overall: 0, subjects: [] };
    }
    
    return calculateAttendanceStats(
      timetable.slots,
      attendanceRecords,
      semesterStart,
      semesterEnd,
      settings,
      weekStart
    );
  }, [timetable, attendanceRecords, semesterStart, semesterEnd, settings, weekStart]);

  // Week navigation
  const handlePreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Timetable updates
  const handleSlotUpdate = async (slotId: string, date: string, newStatus: string) => {
    const key = `${date}-${slotId}`;
    
    // If clearing, delete the record
    if (newStatus === "clear") {
      // Optimistic update - remove from map
      setAttendanceRecords(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      
      // Delete from database
      try {
        await fetch('/api/attendance', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotId, date }),
        });
      } catch (error) {
        console.error('Error clearing attendance:', error);
        // Revert on error
        router.refresh();
      }
      return;
    }
    
    // Optimistic update
    setAttendanceRecords(prev => {
      const newMap = new Map(prev);
      newMap.set(key, newStatus);
      return newMap;
    });
    
    // Save to database
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, date, status: newStatus }),
      });
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const handleSlotDelete = async (slotId: string) => {
    if (!timetable) return;
    
    try {
      const response = await fetch('/api/timetable/slot', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete slot');
      }
      
      // Update local state immediately
      setTimetable(prev => {
        if (!prev) return null;
        return {
          ...prev,
          slots: prev.slots.filter(s => s.id !== slotId)
        };
      });
    } catch (error) {
      console.error('Error deleting slot:', error);
    }
  };

  const handleSlotEdit = async (updatedSlot: any) => {
    if (!timetable) return;
    
    // Optimistic update
    setTimetable(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slots: prev.slots.map(s => s.id === updatedSlot.id ? updatedSlot : s)
      };
    });
    
    // Save to database
    try {
      const updateData: any = {
        slotId: updatedSlot.id,
        subject: updatedSlot.subject,
        subjectName: updatedSlot.subjectName,
        room: updatedSlot.room,
        instructor: updatedSlot.instructor,
      };

      // Include rowSpan and endTime if they exist (for merging)
      if (updatedSlot.rowSpan !== undefined) {
        updateData.rowSpan = updatedSlot.rowSpan;
        updateData.endTime = updatedSlot.endTime;
      }

      await fetch('/api/timetable/slot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    } catch (error) {
      console.error('Error updating slot:', error);
      // Revert optimistic update on error
      router.refresh();
    }
  };

  const handleSlotAdd = async (day: number, startTime: string, endTime: string, subject: string, subjectName: string, type: "lecture" | "lab") => {
    if (!timetable) return;
    
    try {
      const response = await fetch('/api/timetable/slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timetableId: timetable.id,
          day,
          startTime,
          endTime,
          subject,
          subjectName,
          type,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error('Failed to add slot');
      }
      
      // Reload timetable
      const ttResponse = await fetch('/api/timetable');
      const ttData = await ttResponse.json();
      
      if (ttData.timetable) {
        setTimetable(ttData.timetable);
        
        // If in edit mode, set the newly created slot to editing
        if (isEditMode && result.slot) {
          setEditingSlot(result.slot.id);
        }
      }
    } catch (error) {
      console.error('Error adding slot:', error);
    }
  };

  const handleSlotMerge = async (slotId: string) => {
    if (!timetable) return;
    
    const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    const currentSlot = timetable.slots.find(s => s.id === slotId);
    if (!currentSlot) return;

    const currentTimeIdx = TIME_SLOTS.indexOf(currentSlot.startTime);
    const nextTimeIdx = currentTimeIdx + (currentSlot.rowSpan || 1);
    
    if (nextTimeIdx >= TIME_SLOTS.length) {
      return;
    }

    const nextTime = TIME_SLOTS[nextTimeIdx];
    const nextSlot = timetable.slots.find(s => s.day === currentSlot.day && s.startTime === nextTime);
    
    if (nextSlot && (nextSlot.subject || nextSlot.subjectName)) {
      return;
    }

    try {
      // Delete next slot if it exists
      if (nextSlot) {
        await handleSlotDelete(nextSlot.id);
        // Wait a bit for delete to complete
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Update current slot with new rowSpan
      const newRowSpan = (currentSlot.rowSpan || 1) + 1;
      const newEndTimeIdx = currentTimeIdx + newRowSpan;
      const newEndTime = TIME_SLOTS[newEndTimeIdx] || "18:00";

      await handleSlotEdit({
        ...currentSlot,
        rowSpan: newRowSpan,
        endTime: newEndTime,
      });

      // Refresh timetable to get updated data
      const ttResponse = await fetch('/api/timetable');
      const ttData = await ttResponse.json();
      if (ttData.timetable) {
        setTimetable(ttData.timetable);
      }
    } catch (error) {
      console.error('Error merging slot:', error);
    }
  };

  const handleSlotUpdateLocal = (slotId: string, updates: Partial<any>) => {
    if (!timetable) return;
    
    setTimetable(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slots: prev.slots.map(s => s.id === slotId ? { ...s, ...updates } : s)
      };
    });
  };

  const handleTimetableNameChange = async (newName: string) => {
    if (!timetable) return;
    
    // Optimistic update
    setTimetable(prev => prev ? ({ ...prev, name: newName }) : null);
    
    // Save to database
    try {
      await fetch('/api/timetable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: timetable.id, name: newName }),
      });
    } catch (error) {
      console.error('Error updating timetable name:', error);
    }
  };

  const handleDatesChange = async (startDate: string, endDate: string) => {
    if (!timetable) return;
    
    try {
      await fetch('/api/timetable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: timetable.id, startDate, endDate }),
      });
      
      setTimetable(prev => prev ? { ...prev, startDate, endDate } : null);
      router.refresh();
    } catch (error) {
      console.error('Error updating timetable dates:', error);
      throw error;
    }
  };

  // Bulk marking
  const handleBulkMark = async (date: string, status: string) => {
    if (!timetable) return;
    
    const slotIds = timetable.slots.map(slot => slot.id);
    
    // Optimistic update
    setAttendanceRecords(prev => {
      const newMap = new Map(prev);
      slotIds.forEach(slotId => {
        const key = `${date}-${slotId}`;
        newMap.set(key, status);
      });
      return newMap;
    });
    
    // Save to database
    try {
      await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIds, date, status }),
      });
    } catch (error) {
      console.error('Error bulk marking attendance:', error);
    }
  };
  
  // Settings update
  const handleSettingsChange = async (newSettings: UserSettings) => {
    // Create a new object reference to ensure React detects the change
    setSettings({ ...newSettings });
    
    // Save to database
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };
  
  // Logout
  // Calculate "at risk" subjects
  const atRiskSubjects = analytics.subjects.filter(s => s.percentage < settings.targetPercentage);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-mono font-semibold">Loading your timetable...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait</p>
        </div>
      </div>
    );
  }
  
  // No timetable state
  if (!timetable) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Guest Banner */}
      <AnimatePresence>
        {showGuestBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 bg-warning/10 border-b border-warning/30 backdrop-blur-sm"
          >
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">You're browsing as a guest</p>
                    <p className="text-xs text-muted-foreground">
                      Your data is temporary. Sign up to save your timetable and attendance permanently.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => router.push('/auth/login')}
                    className="gap-2 font-mono"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowGuestBanner(false)}
                    className="p-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Left Panel - Resizable Stats + Settings */}
      <AnimatePresence>
        {isLeftPanelOpen && (
          <ResizableLeftPanel onClose={() => setIsLeftPanelOpen(false)}>
            <div className="p-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Overall */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <TrendingUp className="w-3 h-3 text-primary" />
                <p className="text-xs font-mono text-muted-foreground uppercase">Overall</p>
              </div>
              <p className="text-5xl font-bold font-mono leading-none">
                {analytics.overall}%
              </p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Target</span>
                  <span className={analytics.overall >= settings.targetPercentage ? "text-success" : "text-warning"}>
                    {settings.targetPercentage}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${analytics.overall >= settings.targetPercentage ? "bg-success" : "bg-warning"}`}
                    style={{ width: `${Math.min(100, analytics.overall)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* At Risk Subjects */}
            {atRiskSubjects.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <AlertCircle className="w-3 h-3 text-warning" />
                  <p className="text-xs font-mono text-muted-foreground uppercase">At Risk</p>
                </div>
                <div className="space-y-1 text-xs">
                  {atRiskSubjects.slice(0, 3).map((s) => (
                    <div key={s.code} className="flex items-center justify-between">
                      <span className="text-warning font-mono">{s.code}</span>
                      <span className="text-muted-foreground">{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inverted Mode Toggle and Bulk Marking */}
            <div className="space-y-1.5">
              {/* Inverted Mode Toggle */}
              <button
                onClick={async () => {
                  const newSettings = { ...settings, invertedMode: !settings.invertedMode };
                  await handleSettingsChange(newSettings);
                }}
                className={`w-full rounded-lg border-2 transition-all font-mono text-xs ${
                  settings.invertedMode 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'bg-background border-border text-foreground hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-semibold text-xs">{settings.invertedMode ? "Inverted Mode" : "Normal Mode"}</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 flex-shrink-0 ${
                    settings.invertedMode ? 'bg-primary-foreground/20 justify-end' : 'bg-muted justify-start'
                  }`}>
                    <div className={`w-4 h-4 rounded-full transition-all ${
                      settings.invertedMode ? 'bg-primary-foreground' : 'bg-muted-foreground'
                    }`} />
                  </div>
                </div>
                <div className="text-[8px] text-center leading-none px-3 pb-2 opacity-70 whitespace-nowrap">
                  {settings.invertedMode ? "Mark absents, unmarked = attended" : "Mark presents, unmarked = absent"}
                </div>
              </button>

              {/* Bulk Marking Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkMarkingOpen(true)}
                className="w-full gap-2 font-mono text-xs"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Mark Entire Day
              </Button>
            </div>
          </motion.div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Semester Info */}
          <SemesterInfo 
            startDate={semesterStart} 
            endDate={semesterEnd}
            onDatesChange={handleDatesChange}
          />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Settings */}
          <AttendanceSettings settings={settings} onChange={handleSettingsChange} />
            </div>
          </ResizableLeftPanel>
        )}
      </AnimatePresence>

      {/* Center Panel - Scrollable (Timetable + Analytics) */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-3 md:p-6 max-w-7xl space-y-6 md:space-y-8">
          {/* Sticky Header with AI Toggle */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-4">
                {/* Left Panel Toggle - Desktop */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                  className="hidden lg:flex"
                >
                  {isLeftPanelOpen ? (
                    <PanelLeftClose className="w-5 h-5" />
                  ) : (
                    <PanelLeftOpen className="w-5 h-5" />
                  )}
                </Button>

                {/* Menu Button - Mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileLeftPanelOpen(true)}
                  className="lg:hidden"
                >
                  <Menu className="w-5 h-5" />
                </Button>

                <h1 className="text-2xl font-bold font-mono tracking-tight">
                  traceIt<span className="text-primary">.</span>
                </h1>
              </div>

              {/* Right Side Buttons */}
              <div className="flex items-center gap-2">
                {/* Mobile: Bulk Mark Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkMarkingOpen(true)}
                  className="gap-2 lg:hidden"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark Day</span>
                </Button>

                <Button
                  variant={isAIPanelOpen ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                  className="gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">AI Advisor</span>
                </Button>

                {/* Profile Dropdown */}
                <ProfileDropdown />
              </div>
            </div>

            <WeekSelector
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onPreviousWeek={handlePreviousWeek}
              onNextWeek={handleNextWeek}
              onToday={handleToday}
            />
          </div>

          {/* Timetable Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <TimetableHeader
              initialName={timetable.name}
              semester={timetable.semester}
              section={timetable.section}
              onNameChange={handleTimetableNameChange}
            />
            <TimetableGrid
              slots={timetable.slots}
              attendanceRecords={attendanceRecords}
              currentWeekStart={weekStart}
              invertedMode={settings.invertedMode || false}
              onSlotUpdate={handleSlotUpdate}
              onSlotDelete={handleSlotDelete}
              onSlotEdit={handleSlotEdit}
              onSlotAdd={handleSlotAdd}
              onSlotMerge={handleSlotMerge}
              onSlotUpdateLocal={handleSlotUpdateLocal}
              editable={true}
              isEditMode={isEditMode}
              editingSlot={editingSlot}
              selectedSlot={selectedSlotId}
              onEditingSlotChange={setEditingSlot}
              onSelectedSlotChange={setSelectedSlotId}
              onEditModeToggle={() => {
                setIsEditMode(!isEditMode);
                setEditingSlot(null);
                setSelectedSlotId(null);
              }}
            />
          </motion.div>

          {/* Analytics Section (Below Timetable) */}
          {settings.showAnalytics && (
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Analytics
                </h2>
                <Button
                  onClick={() => setIsWrappedOpen(true)}
                  size="sm"
                  variant="outline"
                  className="border-2 border-border hover:border-foreground hover:bg-muted font-mono"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Wrapped
                </Button>
              </div>
              <AnalyticsSection
                overall={analytics.overall}
                target={settings.targetPercentage}
                subjects={analytics.subjects}
                weeklyTrend={[]}
                includeLabsInOverall={settings.includeLabsInOverall !== false}
                onToggleLabs={async (include) => {
                  const newSettings = { ...settings, includeLabsInOverall: include };
                  await handleSettingsChange(newSettings);
                }}
              />
            </div>
          )}

          {/* Empty State */}
          {timetable.slots.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <h3 className="text-xl font-mono font-semibold text-muted-foreground mb-2">
                No Classes Added
              </h3>
              <p className="text-sm text-muted-foreground">
                Click on any time slot above to add your classes
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Right Panel - AI Chat (Desktop) */}
      <AnimatePresence>
        {isAIPanelOpen && (
          <ResizableAIPanel onClose={() => setIsAIPanelOpen(false)} />
        )}
      </AnimatePresence>

      {/* Mobile Chat Button */}
      <AnimatePresence>
        {!isAIPanelOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="lg:hidden"
          >
            <Button
              className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40"
              onClick={() => setIsMobileChatOpen(true)}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Left Panel Drawer */}
      <AnimatePresence>
        {isMobileLeftPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileLeftPanelOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-full sm:w-[320px] bg-background z-50 lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-mono font-semibold uppercase tracking-wider">Dashboard</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileLeftPanelOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 space-y-6">
                {/* Overall */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <p className="text-xs font-mono text-muted-foreground uppercase">Overall</p>
                  </div>
                  <p className="text-5xl font-bold font-mono leading-none">
                    {analytics.overall}%
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Target</span>
                      <span className={analytics.overall >= settings.targetPercentage ? "text-success" : "text-warning"}>
                        {settings.targetPercentage}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${analytics.overall >= settings.targetPercentage ? "bg-success" : "bg-warning"}`}
                        style={{ width: `${Math.min(100, analytics.overall)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* At Risk Subjects */}
                {atRiskSubjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <AlertCircle className="w-3 h-3 text-warning" />
                      <p className="text-xs font-mono text-muted-foreground uppercase">At Risk</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      {atRiskSubjects.slice(0, 3).map((s) => (
                        <div key={s.code} className="flex items-center justify-between">
                          <span className="text-warning font-mono">{s.code}</span>
                          <span className="text-muted-foreground">{s.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bulk Marking Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsBulkMarkingOpen(true);
                    setIsMobileLeftPanelOpen(false);
                  }}
                  className="w-full gap-2 font-mono text-xs"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Mark Entire Day
                </Button>

                <div className="border-t border-border" />

                {/* Semester Info */}
                <SemesterInfo 
                  startDate={semesterStart} 
                  endDate={semesterEnd}
                  onDatesChange={handleDatesChange}
                />

                <div className="border-t border-border" />

                {/* Settings */}
                <AttendanceSettings settings={settings} onChange={handleSettingsChange} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Chat Drawer */}
      <AnimatePresence>
        {isMobileChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileChatOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-background z-50 lg:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-mono font-semibold uppercase tracking-wider">AI Advisor</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileChatOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="h-[calc(100%-57px)]">
                <AIChatPanel />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bulk Marking Dialog */}
      <BulkMarkingDialog
        isOpen={isBulkMarkingOpen}
        onClose={() => setIsBulkMarkingOpen(false)}
        onBulkMark={handleBulkMark}
      />

      {/* Attendance Wrapped */}
      {timetable && (
        <AttendanceWrapped
          isOpen={isWrappedOpen}
          onClose={() => setIsWrappedOpen(false)}
          overallPercentage={analytics.overall}
          subjects={analytics.subjects}
          semesterName={timetable.name || "Current Semester"}
          startDate={timetable.startDate}
          endDate={timetable.endDate}
          userEmail={userEmail || undefined}
        />
      )}
    </div>
  );
}
