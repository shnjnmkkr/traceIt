"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TimetableSlot } from "@/types";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlotDialog } from "./SlotDialog";
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
  editable?: boolean;
}

export function TimetableGrid({ slots, attendanceRecords, currentWeekStart, onSlotUpdate, onSlotDelete, editable = true }: TimetableGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ slot: TimetableSlot; date: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [slotPosition, setSlotPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [mergingSlots, setMergingSlots] = useState<string[]>([]);

  const getSlotForCell = (day: number, time: string) => {
    return slots.find(
      (slot) => slot.day === day && slot.startTime === time
    );
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
      onSlotDelete(selectedSlot.id);
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
            <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: `100px repeat(${TIME_SLOTS.length}, 1fr)` }}>
              <div className="text-xs font-mono text-muted-foreground p-2 uppercase">Day</div>
              {TIME_SLOTS.map((time, idx) => {
                const nextTime = TIME_SLOTS[idx + 1];
                const endTime = nextTime || (parseInt(time.split(':')[0]) + 1) + ':00';
                return (
                  <div key={time} className="text-xs font-mono font-semibold text-center p-2 tracking-wider">
                    {time}-{endTime}
                  </div>
                );
              })}
            </div>

            {/* Day rows */}
            {DAYS.map((day, dayIdx) => (
              <motion.div
                key={day}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: dayIdx * 0.03 }}
                className="grid gap-3 mb-3"
                style={{ gridTemplateColumns: `100px repeat(${TIME_SLOTS.length}, 1fr)` }}
              >
                <div className="text-xs font-mono font-semibold p-2 flex items-center uppercase tracking-wider">
                  {day}
                </div>
                
                {TIME_SLOTS.map((time) => {
                  const slot = getSlotForCell(dayIdx, time);
                  const date = getDateForDay(dayIdx);
                  
                  if (!slot) {
                    return (
                      <motion.div
                        key={`${dayIdx}-${time}`}
                        whileHover={{ scale: 1.02, borderColor: "#16a34a" }}
                        className="min-h-[70px] border border-dashed border-border rounded-md p-2 cursor-pointer hover:bg-muted/30 transition-all flex items-center justify-center group"
                      >
                        <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity" />
                      </motion.div>
                    );
                  }

                  // Skip if this is part of a colSpan (already rendered)
                  if (slot.rowSpan && slot.rowSpan > 1 && slot.startTime !== time) {
                    return null;
                  }

                  const isMerging = mergingSlots.includes(slot.id);
                  const status = getSlotStatus(slot.id, date);

                  return (
                    <motion.div
                      key={`${slot.id}-${date}-${status}`}
                      whileHover={{ scale: 1.03, zIndex: 10 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => handleSlotClick(slot, date, e)}
                      style={{
                        gridColumn: slot.rowSpan ? `span ${slot.rowSpan}` : "span 1",
                        backgroundColor: `${slot.color || getStatusColor(status)}08`,
                        borderColor: slot.color || getStatusColor(status),
                      }}
                      className={`
                        min-h-[70px] border-2 rounded-md p-3 cursor-pointer transition-all
                        ${isMerging ? "ring-2 ring-warning shadow-lg" : ""}
                      `}
                    >
                      <div className="flex flex-col h-full justify-between">
                        <div>
                          <div className="text-sm font-mono font-bold truncate">
                            {slot.subject}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {slot.subjectName}
                          </div>
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className="text-xs w-fit mt-2"
                          style={{
                            borderColor: getStatusColor(status),
                            color: getStatusColor(status),
                          }}
                        >
                          {getStatusLabel(status)}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
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
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedSlot(null);
          setSlotPosition(null);
        }}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </>
  );
}
