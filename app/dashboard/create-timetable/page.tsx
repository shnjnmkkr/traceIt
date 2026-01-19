"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Plus, Save, Trash2, GripHorizontal, Merge, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { ImageUploadDialog } from "@/components/timetable/ImageUploadDialog";
import { CommunityTemplates } from "@/components/timetable/CommunityTemplates";
import { ShareTemplateDialog } from "@/components/timetable/ShareTemplateDialog";
import { InvertedModeDialog } from "@/components/timetable/InvertedModeDialog";
import { usePageView, trackFeature } from "@/hooks/useAnalytics";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

interface Slot {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  subject: string;
  subjectName: string;
  room?: string;
  instructor?: string;
  rowSpan?: number;
  type?: "lecture" | "lab";
}

export default function CreateTimetablePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Track page view
  usePageView();
  
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");

  // Timetable metadata
  const [name, setName] = useState("Even Semester 2026");
  const [semester, setSemester] = useState("Even Semester 2026");
  const [section, setSection] = useState("");
  const [startDate, setStartDate] = useState("2026-01-05");
  const [endDate, setEndDate] = useState("2026-04-22");

  // Slots
  const [slots, setSlots] = useState<Slot[]>([]);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // New features
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showCommunityPanel, setShowCommunityPanel] = useState(true); // Show templates by default for new users
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showInvertedModeDialog, setShowInvertedModeDialog] = useState(false);
  const [usedCommunityTemplate, setUsedCommunityTemplate] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const getCellKey = (day: number, timeIndex: number) => `${day}-${timeIndex}`;

  const getSlotAtCell = (day: number, time: string) => {
    return slots.find(s => s.day === day && s.startTime === time);
  };

  // Check if a cell is covered by a merged cell
  const isCellCovered = (day: number, timeIdx: number): boolean => {
    const time = TIME_SLOTS[timeIdx];
    // Find if any slot on this day covers this time
    return slots.some(slot => {
      if (slot.day !== day) return false;
      const slotStartIdx = TIME_SLOTS.indexOf(slot.startTime);
      const slotEndIdx = slotStartIdx + (slot.rowSpan || 1);
      return timeIdx > slotStartIdx && timeIdx < slotEndIdx;
    });
  };

  const handleCellClick = (day: number, timeIndex: number) => {
    const time = TIME_SLOTS[timeIndex];

    // Clean up previous editing slot if it's empty
    if (editingSlot) {
      const previousSlot = slots.find(s => s.id === editingSlot);
      if (previousSlot && !previousSlot.subject && !previousSlot.subjectName) {
        setSlots(slots.filter(s => s.id !== editingSlot));
      }
    }

    const existing = getSlotAtCell(day, time);
    if (existing) {
      // If clicking the same slot, toggle between edit and select
      if (editingSlot === existing.id) {
        if (existing.subject || existing.subjectName) {
          setEditingSlot(null);
          setSelectedSlot(existing.id);
        }
      } else if (selectedSlot === existing.id) {
        setEditingSlot(existing.id);
        setSelectedSlot(null);
      } else {
        setEditingSlot(existing.id);
        setSelectedSlot(null);
      }
    } else {
      const endTime = TIME_SLOTS[timeIndex + 1] || "18:00";
      
      const newSlot: Slot = {
        id: `slot-${Date.now()}`,
        day,
        startTime: time,
        endTime,
        subject: "",
        subjectName: "",
        rowSpan: 1,
      };
      
      setSlots(prev => [...prev.filter(s => s.id !== editingSlot || s.subject || s.subjectName), newSlot]);
      setEditingSlot(newSlot.id);
      setSelectedSlot(null);
    }
  };

  const updateSlot = (id: string, updates: Partial<Slot>) => {
    setSlots(slots.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
    setEditingSlot(null);
  };

  const handleMergeRight = (slotId: string) => {
    const currentSlot = slots.find(s => s.id === slotId);
    if (!currentSlot) return;

    const currentTimeIdx = TIME_SLOTS.indexOf(currentSlot.startTime);
    const nextTimeIdx = currentTimeIdx + (currentSlot.rowSpan || 1);
    
    if (nextTimeIdx >= TIME_SLOTS.length) return; // Can't merge beyond last slot

    // Check if next cell is empty
    const nextTime = TIME_SLOTS[nextTimeIdx];
    const nextSlot = getSlotAtCell(currentSlot.day, nextTime);
    if (nextSlot && (nextSlot.subject || nextSlot.subjectName)) return; // Can't merge if filled

    // Remove next slot if it exists but is empty
    if (nextSlot) {
      setSlots(prev => prev.filter(s => s.id !== nextSlot.id));
    }

    // Expand current slot
    const newRowSpan = (currentSlot.rowSpan || 1) + 1;
    const newEndTimeIdx = currentTimeIdx + newRowSpan;
    
    setSlots(prev => prev.map(s => 
      s.id === slotId 
        ? { ...s, rowSpan: newRowSpan, endTime: TIME_SLOTS[newEndTimeIdx] || "18:00" }
        : s
    ));
  };

  const handleSubmit = async () => {
    if (!name || !semester || slots.length === 0) {
      setError("Please fill in details and add at least one class");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          semester,
          section,
          startDate,
          endDate,
          slots: slots.map(s => ({
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            subject: s.subject,
            subjectName: s.subjectName,
            room: s.room,
            instructor: s.instructor,
            rowSpan: s.rowSpan,
            type: s.type || 'lecture',
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create timetable');
      }

      // Track timetable creation
      trackFeature('timetable_create', { 
        slotCount: slots.length,
        usedTemplate: usedCommunityTemplate 
      });

      // For new users, ask about inverted mode first
      setShowInvertedModeDialog(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler for community template selection
  const handleTemplateSelect = (template: any) => {
    const templateSlots = template.template_data.slots || [];
    const newSlots = templateSlots.map((slot: any, idx: number) => ({
      ...slot,
      id: `slot-${Date.now()}-${idx}`,
    }));
    setSlots(newSlots);
    setUsedCommunityTemplate(true);
    setShowCommunityPanel(false);
  };

  // Handler for image extraction
  const handleImageExtracted = (extractedSlots: any[]) => {
    const newSlots = extractedSlots.map((slot: any, idx: number) => ({
      ...slot,
      id: `slot-${Date.now()}-${idx}`,
    }));
    setSlots(newSlots);
    setShowImageUpload(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold font-mono mb-2">
              Create Your Timetable
            </h1>
            <p className="text-muted-foreground">
              Click cells to add classes. Click filled cells to select, then use + button to merge for labs
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-error"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-muted rounded px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase">Semester</label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full bg-muted rounded px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase">Section</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="Optional"
                className="w-full bg-muted rounded px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-muted rounded px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase">End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-muted rounded px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Area with Community Panel */}
        <div className="flex gap-4 items-start">
          {/* Timetable Grid - DAYS AS ROWS, TIME AS COLUMNS */}
          <Card className={`p-6 overflow-x-auto transition-all relative flex flex-col ${showCommunityPanel ? 'w-2/3 h-[calc(100vh-12rem)]' : 'w-full'}`}>
          {/* Action Buttons - Top Right, outside grid */}
          <div className="flex justify-end gap-2 mb-4">
            <Button
              onClick={() => setShowImageUpload(true)}
              variant="outline"
              size="sm"
              className="gap-2 font-mono"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </Button>
            <Button
              onClick={() => setShowCommunityPanel(!showCommunityPanel)}
              variant="outline"
              size="sm"
              className="gap-2 font-mono"
            >
              <Users className="w-4 h-4" />
              {showCommunityPanel ? 'Hide' : 'Show'} Templates
            </Button>
          </div>
          
          <div className="min-w-[1000px] flex-1 overflow-y-auto">
            {/* Header Row - Time Slots */}
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `100px repeat(${TIME_SLOTS.length}, 1fr)` }}>
              <div className="text-xs font-mono font-semibold text-muted-foreground p-2">Day</div>
              {TIME_SLOTS.map((time, idx) => {
                const nextTime = TIME_SLOTS[idx + 1];
                const endTime = nextTime || (parseInt(time.split(':')[0]) + 1) + ':00';
                return (
                  <div key={time} className="text-xs font-mono font-semibold text-center p-2">
                    {time}-{endTime}
                  </div>
                );
              })}
            </div>

            {/* Rows - Each Day */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="grid gap-2 mb-2" style={{ gridTemplateColumns: `100px repeat(${TIME_SLOTS.length}, 1fr)` }}>
                <div className="text-xs font-mono font-semibold p-2 flex items-center uppercase tracking-wider">
                  {day}
                </div>
                
                {TIME_SLOTS.map((time, timeIdx) => {
                  const cellKey = getCellKey(dayIdx, timeIdx);
                  
                  // Skip rendering if this cell is covered by a merged cell
                  if (isCellCovered(dayIdx, timeIdx)) {
                    return null;
                  }

                  const slot = getSlotAtCell(dayIdx, time);
                  
                  const isSlotSelected = slot && selectedSlot === slot.id;
                  const canMergeRight = isSlotSelected && timeIdx + (slot.rowSpan || 1) < TIME_SLOTS.length;

                  // Calculate explicit grid column position
                  // +2 because column 1 is the day label
                  const gridColumnStart = timeIdx + 2;
                  const gridColumnEnd = slot?.rowSpan ? gridColumnStart + slot.rowSpan : gridColumnStart + 1;

                  return (
                    <div
                      key={cellKey}
                      onClick={() => handleCellClick(dayIdx, timeIdx)}
                      className={`min-h-[110px] border-2 rounded-md p-3 cursor-pointer transition-all relative ${
                        isSlotSelected
                          ? 'border-warning bg-warning/10 shadow-lg'
                          : slot && (slot.subject || slot.subjectName)
                          ? 'border-primary bg-primary/5 hover:bg-primary/10'
                          : 'border-dashed border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      style={{ gridColumnStart, gridColumnEnd }}
                    >
                      {slot && (slot.subject || slot.subjectName || editingSlot === slot.id) ? (
                        <div className="h-full flex flex-col">
                          {editingSlot === slot.id ? (
                            <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={slot.subjectName}
                                onChange={(e) => updateSlot(slot.id, { subjectName: e.target.value })}
                                placeholder="Subject"
                                autoFocus
                                className="w-full bg-background rounded px-2 py-1 text-xs border border-border"
                              />
                              <div>
                                <input
                                  type="text"
                                  value={slot.subject}
                                  onChange={(e) => updateSlot(slot.id, { subject: e.target.value })}
                                  placeholder="Code"
                                  className="w-full bg-background rounded px-2 py-1 text-xs font-mono font-bold border border-border"
                                />
                                <p className="text-[9px] text-muted-foreground mt-0.5 opacity-70 leading-tight">
                                  ⚠️ Same code for lab & lecture. Case matters (EE202 ≠ ee202).
                                </p>
                              </div>
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateSlot(slot.id, { type: "lecture" });
                                  }}
                                  className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                                    (slot.type === "lecture" || !slot.type)
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-background border-border text-muted-foreground hover:border-primary'
                                  }`}
                                >
                                  Lecture
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateSlot(slot.id, { type: "lab" });
                                  }}
                                  className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                                    slot.type === "lab"
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-background border-border text-muted-foreground hover:border-primary'
                                  }`}
                                >
                                  Lab
                                </button>
                              </div>
                              <div className="flex gap-1 mt-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!slot.subject && !slot.subjectName) {
                                      deleteSlot(slot.id);
                                    } else {
                                      setEditingSlot(null);
                                      setSelectedSlot(slot.id);
                                    }
                                  }}
                                  className="text-xs h-6 px-2"
                                >
                                  Done
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSlot(slot.id);
                                  }}
                                  className="text-xs h-6 px-2 text-error"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm font-mono font-bold text-primary leading-tight">
                                  {slot.subject}
                                </div>
                                {slot.type === "lab" && (
                                  <div className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded font-mono font-bold">
                                    LAB
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                                {slot.subjectName}
                              </div>
                              {slot.rowSpan && slot.rowSpan > 1 && (
                                <div className="text-xs text-primary/60 mt-auto flex items-center gap-1">
                                  <GripHorizontal className="w-3 h-3" />
                                  {slot.rowSpan}h
                                </div>
                              )}
                              
                              {/* Merge Button - Shows when slot is selected */}
                              {isSlotSelected && canMergeRight && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMergeRight(slot.id);
                                  }}
                                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 hover:scale-110 transition-all z-10"
                                  title="Merge with next hour"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-0 hover:opacity-50 transition-opacity">
                          <Plus className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {slots.length} classes added
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmit}
                disabled={loading || slots.length === 0}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                  <Save className="w-4 h-4" />
                  Create Timetable
                </>
              )}
            </Button>
            </div>
          </div>
        </Card>

        {/* Community Templates Panel */}
        {showCommunityPanel && (
          <Card className="w-1/3 h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
            <CommunityTemplates onSelectTemplate={handleTemplateSelect} />
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <ImageUploadDialog
        isOpen={showImageUpload}
        onClose={() => setShowImageUpload(false)}
        onExtracted={handleImageExtracted}
      />

      <ShareTemplateDialog
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          window.location.href = '/dashboard';
        }}
        timetableData={{ slots }}
      />

      <InvertedModeDialog
        isOpen={showInvertedModeDialog}
        onClose={() => {
          setShowInvertedModeDialog(false);
          // After inverted mode dialog, show share dialog if applicable
          if (!usedCommunityTemplate) {
            setShowShareDialog(true);
          } else {
            window.location.href = '/dashboard';
          }
        }}
        onEnable={async () => {
          // Enable inverted mode
          try {
            await fetch('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invertedMode: true }),
            });
          } catch (error) {
            console.error('Error enabling inverted mode:', error);
          }
          setShowInvertedModeDialog(false);
          // After enabling, show share dialog if applicable
          if (!usedCommunityTemplate) {
            setShowShareDialog(true);
          } else {
            window.location.href = '/dashboard';
          }
        }}
        onSkip={() => {
          setShowInvertedModeDialog(false);
          // After skipping, show share dialog if applicable
          if (!usedCommunityTemplate) {
            setShowShareDialog(true);
          } else {
            window.location.href = '/dashboard';
          }
        }}
      />
      </div>
    </div>
  );
}
