"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TimetableSlot } from "@/types";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Maximize2, Merge, Trash2, Edit2, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlotDialog } from "./SlotDialog";
import { AddSlotDialog } from "./AddSlotDialog";
import { addDays, format, isBefore, startOfDay } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const STATUS_LEGEND = [
  { key: "attended", label: "Attended" },
  { key: "absent", label: "Absent" },
  { key: "bunk", label: "Mass Bunked" },
  { key: "teacher_absent", label: "Teacher Absent" },
  { key: "holiday", label: "Holiday" },
  { key: "upcoming", label: "Upcoming" },
  { key: "unmarked", label: "Not Marked" },
];

interface TimetableGridProps {
  slots: TimetableSlot[];
  attendanceRecords: Map<string, string>;
  currentWeekStart: Date;
  invertedMode?: boolean;
  onSlotUpdate?: (slotId: string, date: string, status: string) => void;
  onSlotDelete?: (slotId: string) => void;
  onSlotEdit?: (slot: TimetableSlot) => void;
  onSlotAdd?: (day: number, startTime: string, endTime: string, subject: string, subjectName: string, type: "lecture" | "lab") => void;
  onSlotMerge?: (slotId: string) => void;
  onSlotUpdateLocal?: (slotId: string, updates: Partial<TimetableSlot>) => void;
  editable?: boolean;
  isEditMode?: boolean;
  editingSlot?: string | null;
  selectedSlot?: string | null;
  onEditingSlotChange?: (slotId: string | null) => void;
  onSelectedSlotChange?: (slotId: string | null) => void;
  onEditModeToggle?: () => void;
}

const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export function TimetableGrid({ 
  slots, 
  attendanceRecords, 
  currentWeekStart,
  onSlotUpdate, 
  onSlotDelete, 
  onSlotEdit, 
  onSlotAdd,
  onSlotMerge,
  onSlotUpdateLocal,
  editable = true,
  isEditMode = false,
  editingSlot: externalEditingSlot,
  selectedSlot: externalSelectedSlot,
  onEditingSlotChange,
  onSelectedSlotChange,
  onEditModeToggle,
}: TimetableGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ slot: TimetableSlot; date: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [slotPosition, setSlotPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [mergingSlots, setMergingSlots] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSlotData, setNewSlotData] = useState<{ day: number; startTime: string; endTime: string } | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const editingSlot = externalEditingSlot !== undefined ? externalEditingSlot : null;
  const selectedSlotId = externalSelectedSlot !== undefined ? externalSelectedSlot : null;
  
  const setEditingSlot = (slotId: string | null) => {
    if (onEditingSlotChange) {
      onEditingSlotChange(slotId);
    }
  };
  
  const setSelectedSlotId = (slotId: string | null) => {
    if (onSelectedSlotChange) {
      onSelectedSlotChange(slotId);
    }
  };

  const getSlotForCell = (day: number, time: string) => {
    return slots.find(
      (slot) => slot.day === day && slot.startTime === time
    );
  };

  // Helper functions for edit mode
  const getSlotAtCell = (day: number, time: string) => {
    return slots.find(s => s.day === day && s.startTime === time);
  };

  const isCellCovered = (day: number, timeIdx: number): boolean => {
    const time = TIME_SLOTS[timeIdx];
    return slots.some(slot => {
      if (slot.day !== day) return false;
      const slotStartIdx = TIME_SLOTS.indexOf(slot.startTime);
      if (slotStartIdx === -1) return false;
      const slotEndIdx = slotStartIdx + (slot.rowSpan || 1);
      return timeIdx > slotStartIdx && timeIdx < slotEndIdx;
    });
  };

  const handleCellClickEditMode = (day: number, timeIndex: number) => {
    if (!isEditMode) return;
    
    const time = TIME_SLOTS[timeIndex];
    const existing = getSlotAtCell(day, time);
    
    if (existing) {
      if (editingSlot === existing.id) {
        if (existing.subject || existing.subjectName) {
          setEditingSlot(null);
          setSelectedSlotId(existing.id);
        } else {
          // Empty slot - remove it
          if (onSlotDelete) {
            onSlotDelete(existing.id);
          }
          setEditingSlot(null);
        }
      } else if (selectedSlotId === existing.id) {
        setEditingSlot(existing.id);
        setSelectedSlotId(null);
      } else {
        setEditingSlot(existing.id);
        setSelectedSlotId(null);
      }
    } else {
      // Empty cell - open add dialog
      const nextTime = TIME_SLOTS[timeIndex + 1] || "18:00";
      setNewSlotData({ day, startTime: time, endTime: nextTime });
      setIsAddDialogOpen(true);
    }
  };

  // Get the date for a specific day of the current week
  const getDateForDay = (dayIndex: number): string => {
    const date = addDays(currentWeekStart, dayIndex);
    return format(date, "yyyy-MM-dd");
  };

  // Get attendance status for a slot on a specific date
  const getSlotStatus = (slotId: string, date: string): string => {
    const key = `${date}-${slotId}`;
    const status = attendanceRecords.get(key);
    if (status) return status;
    
    // Check if date is in the past
    const slotDate = new Date(date);
    const today = startOfDay(new Date());
    const isPastDate = isBefore(slotDate, today);
    
    if (!isPastDate) {
      return "upcoming";
    }
    
    // For past dates, return unmarked (will be handled by calculator)
    return "unmarked";
  };

  const handleSlotClick = (slot: TimetableSlot, date: string, event: React.MouseEvent<HTMLDivElement>) => {
    if (mergingSlots.length > 0) {
      // Merging mode
      if (mergingSlots.includes(slot.id)) {
        setMergingSlots(mergingSlots.filter(id => id !== slot.id));
      } else {
        setMergingSlots([...mergingSlots, slot.id]);
      }
    } else {
      // Get the position of the clicked slot
      const rect = event.currentTarget.getBoundingClientRect();
      setSlotPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      });
      
      // Normal selection - open dialog
      setSelectedSlot({ slot, date });
      setIsDialogOpen(true);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (selectedSlot && onSlotUpdate) {
      onSlotUpdate(selectedSlot.slot.id, selectedSlot.date, newStatus);
    }
  };

  const handleDelete = () => {
    if (selectedSlot && onSlotDelete) {
      onSlotDelete(selectedSlot.slot.id);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header with legend and edit button */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4">
            {/* Legend */}
            <div className="flex items-center gap-2 md:gap-4 flex-1 overflow-x-auto pb-2 md:pb-0">
              {STATUS_LEGEND.map((status, idx) => (
                <motion.div
                  key={status.key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-1 md:gap-1.5 flex-shrink-0"
                >
                  <div
                    className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm border-2 flex-shrink-0"
                    style={{
                      backgroundColor: `${getStatusColor(status.key)}20`,
                      borderColor: getStatusColor(status.key),
                    }}
                  />
                  <span className="text-[10px] md:text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {status.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Edit Mode Toggle Button */}
            {onEditModeToggle && (
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={onEditModeToggle}
                className="gap-2 flex-shrink-0"
              >
                {isEditMode ? (
                  <>
                    <Save className="w-4 h-4" />
                    Exit Edit
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Timetable Grid with Integrated Scroll */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px] md:min-w-[1000px] p-2.5 md:p-5">
            {/* Header row - Time slots */}
            <div 
              className="grid gap-1 md:gap-1.5 mb-1.5 md:mb-2" 
              style={{ gridTemplateColumns: `70px repeat(${TIME_SLOTS.length}, minmax(75px, 1fr))` }}
            >
              <div className="text-[10px] md:text-xs font-mono font-semibold text-muted-foreground p-1.5 md:p-2 border-r border-border">Day</div>
              {TIME_SLOTS.map((time, idx) => {
                const nextTime = TIME_SLOTS[idx + 1];
                const endTime = nextTime || (parseInt(time.split(':')[0]) + 1) + ':00';
                return (
                  <div key={time} className="text-[10px] md:text-xs font-mono font-semibold text-center p-1.5 md:p-2">
                    {time}-{endTime}
                  </div>
                );
              })}
            </div>

            {/* Rows - Each Day */}
            {DAYS.map((day, dayIdx) => (
              <div 
                key={day} 
                className="grid gap-1 md:gap-1.5 mb-1.5 md:mb-2"
                style={{ gridTemplateColumns: `70px repeat(${TIME_SLOTS.length}, minmax(75px, 1fr))` }}
              >
                <div className="text-[10px] md:text-xs font-mono font-semibold p-1.5 md:p-2 flex items-center uppercase tracking-wider border-r border-border">
                  {day}
                </div>
                
                {TIME_SLOTS.map((time, timeIdx) => {
                  // Check if this cell is covered by a merged cell
                  const isCovered = isEditMode 
                    ? isCellCovered(dayIdx, timeIdx)
                    : TIME_SLOTS.some((t, idx) => {
                        if (idx >= timeIdx) return false;
                        const s = getSlotForCell(dayIdx, t);
                        if (!s || !s.rowSpan) return false;
                        const slotEndIdx = idx + s.rowSpan;
                        return timeIdx < slotEndIdx;
                      });
                  
                  if (isCovered) {
                    return null;
                  }

                  const slot = getSlotForCell(dayIdx, time);
                  const date = getDateForDay(dayIdx);
                  
                  const isSlotSelected = isEditMode ? selectedSlotId === slot?.id : false;
                  const isSlotEditing = isEditMode ? editingSlot === slot?.id : false;
                  const gridColumnStart = timeIdx + 2;
                  const gridColumnEnd = slot?.rowSpan ? gridColumnStart + slot.rowSpan : gridColumnStart + 1;
                  
                  // Check if merge is possible
                  let canMergeRight = false;
                  if ((isSlotSelected || isSlotEditing) && slot) {
                    const nextTimeIdx = timeIdx + (slot.rowSpan || 1);
                    if (nextTimeIdx < TIME_SLOTS.length) {
                      const nextTime = TIME_SLOTS[nextTimeIdx];
                      const nextSlot = getSlotAtCell(dayIdx, nextTime);
                      // Can merge if next slot doesn't exist or is empty
                      canMergeRight = !nextSlot || (!nextSlot.subject && !nextSlot.subjectName);
                    }
                  }

                  if (!slot) {
                    const nextTime = TIME_SLOTS[timeIdx + 1] || "18:00";
                    
                    return (
                      <div
                        key={`${dayIdx}-${time}`}
                        onClick={() => {
                          if (isEditMode) {
                            handleCellClickEditMode(dayIdx, timeIdx);
                          } else if (editable && onSlotAdd) {
                            setNewSlotData({ day: dayIdx, startTime: time, endTime: nextTime });
                            setIsAddDialogOpen(true);
                          }
                        }}
                        className="min-h-[55px] md:min-h-[65px] border-2 border-dashed border-border rounded-md p-1.5 md:p-2 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all flex items-center justify-center group touch-manipulation"
                        style={{ gridColumnStart, gridColumnEnd }}
                      >
                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 group-active:opacity-100 transition-opacity" />
                      </div>
                    );
                  }

                  const isMerging = mergingSlots.includes(slot.id);
                  const status = getSlotStatus(slot.id, date);

                  return (
                    <div
                      key={`${slot.id}-${date}`}
                      onClick={(e) => {
                        if (isEditMode) {
                          handleCellClickEditMode(dayIdx, timeIdx);
                        } else {
                          handleSlotClick(slot, date, e);
                        }
                      }}
                      className={`${isSlotEditing ? 'min-h-0' : 'min-h-[75px] md:min-h-[95px]'} border-2 rounded-md p-1.5 md:p-2.5 cursor-pointer transition-all relative touch-manipulation ${
                        isEditMode && isSlotSelected
                          ? 'border-warning bg-warning/10 shadow-lg'
                          : isEditMode && isSlotEditing
                          ? 'border-primary bg-primary/10'
                          : slot && (slot.subject || slot.subjectName)
                          ? 'border-primary bg-primary/5 hover:bg-primary/10 active:bg-primary/15'
                          : 'border-dashed border-border hover:border-primary/50 hover:bg-muted/50 active:bg-muted/70'
                      } ${isMerging ? 'ring-2 ring-warning shadow-lg' : ''}`}
                      style={{
                        gridColumnStart,
                        gridColumnEnd,
                        backgroundColor: isEditMode ? undefined : `${slot.color || getStatusColor(status)}08`,
                        borderColor: isEditMode ? undefined : (slot.color || getStatusColor(status)),
                      }}
                    >
                      {isEditMode && isSlotEditing ? (
                        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={slot.subjectName || ''}
                            onChange={(e) => {
                              if (onSlotUpdateLocal) {
                                onSlotUpdateLocal(slot.id, { subjectName: e.target.value });
                              }
                            }}
                            onBlur={() => {
                              if (onSlotEdit && (slot.subject || slot.subjectName)) {
                                onSlotEdit(slot);
                              }
                            }}
                            placeholder="Subject Name"
                            autoFocus
                            className="w-full bg-background rounded px-2 py-1 text-xs border border-border"
                          />
                          <input
                            type="text"
                            value={slot.subject || ''}
                            onChange={(e) => {
                              if (onSlotUpdateLocal) {
                                onSlotUpdateLocal(slot.id, { subject: e.target.value });
                              }
                            }}
                            onBlur={() => {
                              if (onSlotEdit && (slot.subject || slot.subjectName)) {
                                onSlotEdit(slot);
                              }
                            }}
                            placeholder="Code"
                            className="w-full bg-background rounded px-2 py-1 text-xs font-mono font-bold border border-border"
                          />
                          <div className="flex flex-wrap gap-1 mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSlotUpdateLocal) {
                                  onSlotUpdateLocal(slot.id, { type: "lecture" });
                                }
                                if (onSlotEdit) {
                                  onSlotEdit({ ...slot, type: "lecture" });
                                }
                              }}
                              className={`flex-1 min-w-[90px] px-2 py-1 text-xs rounded border transition-all ${
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
                                if (onSlotUpdateLocal) {
                                  onSlotUpdateLocal(slot.id, { type: "lab" });
                                }
                                if (onSlotEdit) {
                                  onSlotEdit({ ...slot, type: "lab" });
                                }
                              }}
                              className={`flex-1 min-w-[90px] px-2 py-1 text-xs rounded border transition-all ${
                                slot.type === "lab"
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background border-border text-muted-foreground hover:border-primary'
                              }`}
                            >
                              Lab
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSlotEdit && (slot.subject || slot.subjectName)) {
                                  onSlotEdit(slot);
                                }
                                setEditingSlot(null);
                              }}
                              className="px-2 py-1 text-xs rounded border border-primary bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1 min-w-[90px]"
                              title="Done editing"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            {canMergeRight && onSlotMerge && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSlotMerge(slot.id);
                                  setEditingSlot(null);
                                }}
                                className="flex-1 px-2 py-1 text-xs rounded border border-primary text-primary hover:bg-primary/10 flex items-center justify-center gap-1 min-w-[90px]"
                              >
                                <Merge className="w-3 h-3" />
                                Merge
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSlotDelete) {
                                  onSlotDelete(slot.id);
                                }
                                setEditingSlot(null);
                              }}
                              className="px-2 py-1 text-xs rounded border border-destructive text-destructive hover:bg-destructive/10 flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col">
                          <div className="flex items-start justify-between gap-1 md:gap-1.5">
                            <div className="text-[11px] md:text-xs font-mono font-bold text-primary leading-tight truncate flex-1">
                              {slot.subject}
                            </div>
                            {slot.type === "lab" && (
                              <div className="text-[9px] md:text-[10px] px-1 py-0.5 bg-primary/20 text-primary rounded font-mono font-bold flex-shrink-0">
                                LAB
                              </div>
                            )}
                          </div>
                          <div className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5 md:mt-1 leading-tight line-clamp-2">
                            {slot.subjectName}
                          </div>
                          
                          {!isEditMode && (
                            <Badge 
                              variant="outline" 
                              className="text-[9px] md:text-[10px] w-fit mt-auto py-0 px-1.5"
                              style={{
                                borderColor: getStatusColor(status),
                                color: getStatusColor(status),
                              }}
                            >
                              {getStatusLabel(status)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Floating Dialog */}
      <SlotDialog
        slot={selectedSlot?.slot || null}
        date={selectedSlot?.date || ""}
        currentStatus={selectedSlot ? getSlotStatus(selectedSlot.slot.id, selectedSlot.date) : "unmarked"}
        isOpen={isDialogOpen}
        slotPosition={slotPosition}
        editable={editable}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedSlot(null);
          setSlotPosition(null);
        }}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onSlotEdit={onSlotEdit}
      />

      {newSlotData && (
        <AddSlotDialog
          day={newSlotData.day}
          startTime={newSlotData.startTime}
          endTime={newSlotData.endTime}
          isOpen={isAddDialogOpen}
          onClose={() => {
            setIsAddDialogOpen(false);
            setNewSlotData(null);
          }}
          onSave={(data) => {
            if (onSlotAdd) {
              onSlotAdd(newSlotData.day, newSlotData.startTime, newSlotData.endTime, data.subject, data.subjectName, data.type);
            }
            setIsAddDialogOpen(false);
            setNewSlotData(null);
          }}
        />
      )}
    </>
  );
}
