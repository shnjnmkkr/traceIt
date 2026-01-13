"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TimetableSlot } from "@/types";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlotDialog } from "./SlotDialog";
import { AddSlotDialog } from "./AddSlotDialog";
import { addDays, format, isBefore, startOfDay } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

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
  onSlotUpdate?: (slotId: string, date: string, status: string) => void;
  onSlotDelete?: (slotId: string) => void;
  onSlotEdit?: (slot: TimetableSlot) => void;
  onSlotAdd?: (day: number, startTime: string, endTime: string, subject: string, subjectName: string, type: "lecture" | "lab") => void;
  editable?: boolean;
}

export function TimetableGrid({ slots, attendanceRecords, currentWeekStart, onSlotUpdate, onSlotDelete, onSlotEdit, onSlotAdd, editable = true }: TimetableGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ slot: TimetableSlot; date: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [slotPosition, setSlotPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [mergingSlots, setMergingSlots] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSlotData, setNewSlotData] = useState<{ day: number; startTime: string; endTime: string } | null>(null);

  // Debug: Log when slots change
  useEffect(() => {
    console.log('🎯 TimetableGrid received slots:', slots);
    console.log('📊 Total slots:', slots.length);
    slots.forEach(slot => {
      console.log(`Slot: day=${slot.day}, startTime="${slot.startTime}", subject=${slot.subject}`);
    });
  }, [slots]);

  const getSlotForCell = (day: number, time: string) => {
    const found = slots.find(
      (slot) => slot.day === day && slot.startTime === time
    );
    if (found) {
      console.log(`✅ Found slot at day=${day}, time=${time}:`, found);
    }
    return found;
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
    if (isBefore(slotDate, today)) {
      return "unmarked";
    }
    return "upcoming";
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
        {/* Header with legend and merge controls */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4">
            {/* Legend - full width */}
            <div className="flex items-center gap-4 flex-1 overflow-x-auto">
              {STATUS_LEGEND.map((status, idx) => (
                <motion.div
                  key={status.key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-1.5 flex-shrink-0"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm border-2"
                    style={{
                      backgroundColor: `${getStatusColor(status.key)}20`,
                      borderColor: getStatusColor(status.key),
                    }}
                  />
                  <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {status.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Far Right: Merge controls if active */}
            {mergingSlots.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline">{mergingSlots.length} selected</Badge>
                <Button size="sm" variant="outline" onClick={() => setMergingSlots([])}>
                  Cancel
                </Button>
                <Button size="sm" disabled={mergingSlots.length < 2}>
                  <Maximize2 className="w-3 h-3 mr-1" />
                  Merge
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Timetable Grid with Integrated Scroll */}
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="min-w-[1000px] p-6">
            {/* Header row - Time slots */}
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
                  // Check if this cell is covered by a merged cell
                  const isCovered = TIME_SLOTS.some((t, idx) => {
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
                  
                  const isSlotSelected = false; // No selection in dashboard view
                  const gridColumnStart = timeIdx + 2;
                  const gridColumnEnd = slot?.rowSpan ? gridColumnStart + slot.rowSpan : gridColumnStart + 1;

                  if (!slot) {
                    const nextTime = TIME_SLOTS[timeIdx + 1] || "18:00";
                    
                    return (
                      <div
                        key={`${dayIdx}-${time}`}
                        onClick={() => {
                          if (editable && onSlotAdd) {
                            setNewSlotData({ day: dayIdx, startTime: time, endTime: nextTime });
                            setIsAddDialogOpen(true);
                          }
                        }}
                        className="min-h-[70px] border-2 border-dashed border-border rounded-md p-3 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all flex items-center justify-center group"
                        style={{ gridColumnStart, gridColumnEnd }}
                      >
                        <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    );
                  }

                  const isMerging = mergingSlots.includes(slot.id);
                  const status = getSlotStatus(slot.id, date);

                  return (
                    <div
                      key={`${slot.id}-${date}`}
                      onClick={(e) => handleSlotClick(slot, date, e)}
                      className={`min-h-[70px] border-2 rounded-md p-3 cursor-pointer transition-all relative ${
                        isMerging ? 'ring-2 ring-warning shadow-lg' : ''
                      }`}
                      style={{
                        gridColumnStart,
                        gridColumnEnd,
                        backgroundColor: `${slot.color || getStatusColor(status)}08`,
                        borderColor: slot.color || getStatusColor(status),
                      }}
                    >
                      <div className="h-full flex flex-col">
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
                        
                        <Badge 
                          variant="outline" 
                          className="text-xs w-fit mt-auto"
                          style={{
                            borderColor: getStatusColor(status),
                            color: getStatusColor(status),
                          }}
                        >
                          {getStatusLabel(status)}
                        </Badge>
                      </div>
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
