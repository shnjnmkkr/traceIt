"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, TrendingUp, Edit2, Save, X } from "lucide-react";
import { differenceInDays, format, differenceInWeeks } from "date-fns";
import { Button } from "@/components/ui/button";

interface SemesterInfoProps {
  startDate: Date;
  endDate: Date;
  onDatesChange?: (startDate: string, endDate: string) => void;
}

export function SemesterInfo({ startDate, endDate, onDatesChange }: SemesterInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStartDate, setEditedStartDate] = useState(format(startDate, "yyyy-MM-dd"));
  const [editedEndDate, setEditedEndDate] = useState(format(endDate, "yyyy-MM-dd"));
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date();
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = Math.max(0, differenceInDays(today, startDate));
  const daysRemaining = Math.max(0, differenceInDays(endDate, today));
  const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  const weeksRemaining = Math.max(0, Math.ceil(differenceInWeeks(endDate, today)));

  const handleSave = async () => {
    if (!onDatesChange) return;
    
    setIsSaving(true);
    try {
      await onDatesChange(editedStartDate, editedEndDate);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating dates:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedStartDate(format(startDate, "yyyy-MM-dd"));
    setEditedEndDate(format(endDate, "yyyy-MM-dd"));
    setIsEditing(false);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-mono font-semibold uppercase">
            Semester Timeline
          </h3>
        </div>
        {onDatesChange && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
            className="h-6 px-2 text-xs"
          >
            {isEditing ? (
              <X className="w-3 h-3" />
            ) : (
              <Edit2 className="w-3 h-3" />
            )}
          </Button>
        )}
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-muted-foreground uppercase">Start</span>
          {isEditing ? (
            <input
              type="date"
              value={editedStartDate}
              onChange={(e) => setEditedStartDate(e.target.value)}
              className="text-xs font-mono font-semibold bg-background border border-border rounded px-2 py-1"
            />
          ) : (
            <span className="text-xs font-mono font-semibold">
              {format(startDate, "dd MMM yyyy")}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-muted-foreground uppercase">End</span>
          {isEditing ? (
            <input
              type="date"
              value={editedEndDate}
              onChange={(e) => setEditedEndDate(e.target.value)}
              className="text-xs font-mono font-semibold bg-background border border-border rounded px-2 py-1"
            />
          ) : (
            <span className="text-xs font-mono font-semibold">
              {format(endDate, "dd MMM yyyy")}
            </span>
          )}
        </div>
        {isEditing && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 text-xs h-7"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 text-xs h-7"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-muted-foreground uppercase">Progress</span>
          <span className="text-xs font-mono font-semibold text-primary">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-2 pt-2">
        <div className="p-2.5 bg-muted rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground uppercase">Elapsed</span>
          </div>
          <div className="text-base font-mono font-bold">
            {daysElapsed}
            <span className="text-xs text-muted-foreground ml-1">days</span>
          </div>
        </div>

        <div className="p-2.5 bg-muted rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground uppercase">Remaining</span>
          </div>
          <div className="text-base font-mono font-bold">
            {weeksRemaining}
            <span className="text-xs text-muted-foreground ml-1">weeks</span>
          </div>
        </div>
      </div>

      {/* Reference Note */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          All attendance calculations are based on this semester timeline.
        </p>
      </div>
    </Card>
  );
}
