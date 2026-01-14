"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Calendar, MapPin, User, Check, Edit2, Save, CheckCircle2 } from "lucide-react";
import { TimetableSlot } from "@/types";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS = [
  { value: "attended", label: "Attended" },
  { value: "absent", label: "Absent" },
  { value: "bunk", label: "Mass Bunked" },
  { value: "teacher_absent", label: "Teacher Absent" },
  { value: "holiday", label: "Holiday" },
];

interface SlotDialogProps {
  slot: TimetableSlot | null;
  date: string;
  currentStatus: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  onSlotEdit?: (slot: TimetableSlot) => void;
  editable?: boolean;
  slotPosition?: { x: number; y: number; width: number; height: number } | null;
}

export function SlotDialog({ slot, date, currentStatus, isOpen, onClose, onStatusChange, onDelete, onSlotEdit, editable = false, slotPosition }: SlotDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSlot, setEditedSlot] = useState(slot);
  
  if (!slot) return null;

  // Calculate initial position for animation
  const initialPosition = slotPosition || { x: window.innerWidth / 2, y: window.innerHeight / 2, width: 200, height: 100 };
  
  // Format the date for display
  const dateDisplay = date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : '';
  
  const handleSave = () => {
    if (onSlotEdit && editedSlot) {
      onSlotEdit(editedSlot);
    }
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Floating Card - Morphing from slot position */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{
                x: initialPosition.x - window.innerWidth / 2,
                y: initialPosition.y - window.innerHeight / 2,
                opacity: 0.5,
                scale: 0.5,
              }}
              animate={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: 1,
              }}
              exit={{
                x: initialPosition.x - window.innerWidth / 2,
                y: initialPosition.y - window.innerHeight / 2,
                opacity: 0,
                scale: 0.5,
              }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 300,
              }}
              className="pointer-events-auto w-full max-w-md"
            >
              <div 
                className="bg-card border-2 rounded-xl shadow-2xl overflow-hidden"
                style={{
                  borderColor: getStatusColor(currentStatus),
                }}
              >
                {/* Header */}
                <div 
                  className="p-6 border-b border-border"
                  style={{
                    backgroundColor: `${getStatusColor(currentStatus)}10`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editedSlot?.subjectName || ''}
                            onChange={(e) => setEditedSlot(prev => prev ? { ...prev, subjectName: e.target.value } : null)}
                            placeholder="Subject"
                            className="w-full bg-background rounded px-3 py-2 text-sm border border-border"
                          />
                          <input
                            type="text"
                            value={editedSlot?.subject || ''}
                            onChange={(e) => setEditedSlot(prev => prev ? { ...prev, subject: e.target.value } : null)}
                            placeholder="Code"
                            className="w-full bg-background rounded px-3 py-2 text-sm font-mono font-bold border border-border"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-xl font-bold font-mono truncate">
                              {slot.subject}
                            </h3>
                            <Badge 
                              variant="outline"
                              className="flex-shrink-0"
                              style={{
                                borderColor: getStatusColor(currentStatus),
                                color: getStatusColor(currentStatus),
                              }}
                            >
                              {getStatusLabel(currentStatus)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {slot.subjectName}
                          </p>
                        </>
                      )}
                      {dateDisplay && !isEditing && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {dateDisplay}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {editable && !isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditing(true)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Details */}
                  {!isEditing && (
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="font-mono">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                      {slot.room && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{slot.room}</span>
                        </div>
                      )}
                      {slot.instructor && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{slot.instructor}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Selection */}
                <div className="p-6">
                  <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
                    Mark Attendance
                  </p>
                  {/* Fixed width container to prevent reflow */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {STATUS_OPTIONS.map((option) => {
                      const isSelected = currentStatus === option.value;
                      const statusColor = getStatusColor(option.value);
                      
                      return (
                        <motion.button
                          key={option.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onStatusChange(option.value)}
                          style={{
                            backgroundColor: isSelected ? `${statusColor}20` : 'transparent',
                            borderColor: isSelected ? statusColor : 'hsl(var(--border))',
                            color: isSelected ? statusColor : 'inherit',
                          }}
                          className={`
                            p-3 rounded-lg border-2 transition-all text-sm font-medium relative
                            min-h-[44px] flex items-center justify-center
                            ${isSelected ? 'shadow-lg' : 'hover:bg-muted'}
                          `}
                        >
                          <span className="font-semibold text-center leading-tight">
                            {option.label}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: statusColor }}
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                    
                    {/* Clear/Unmark button - only show if there's a marked status, positioned to the right of Holiday */}
                    {(currentStatus !== "upcoming" && currentStatus !== "unmarked") && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onStatusChange("clear")}
                        className="p-3 rounded-lg border-2 border-dashed border-muted-foreground/50 text-muted-foreground hover:bg-muted hover:border-muted-foreground transition-all text-sm font-medium min-h-[44px] flex items-center justify-center"
                      >
                        <span className="font-semibold text-center leading-tight">
                          Clear / Unmark
                        </span>
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditedSlot(slot);
                          setIsEditing(false);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        className="flex-1"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={onClose}
                        className="text-green-600 border-green-600 hover:bg-green-600/10 flex-1"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Done
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          onDelete();
                          onClose();
                        }}
                        className="text-error border-error hover:bg-error/10 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
