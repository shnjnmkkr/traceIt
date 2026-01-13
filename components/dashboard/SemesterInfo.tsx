"use client";

import { Card } from "@/components/ui/card";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { differenceInDays, format, differenceInWeeks } from "date-fns";

interface SemesterInfoProps {
  startDate: Date;
  endDate: Date;
}

export function SemesterInfo({ startDate, endDate }: SemesterInfoProps) {
  const today = new Date();
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = Math.max(0, differenceInDays(today, startDate));
  const daysRemaining = Math.max(0, differenceInDays(endDate, today));
  const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  const weeksRemaining = Math.max(0, Math.ceil(differenceInWeeks(endDate, today)));

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-mono font-semibold uppercase">
          Semester Timeline
        </h3>
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-muted-foreground uppercase">Start</span>
          <span className="text-xs font-mono font-semibold">
            {format(startDate, "dd MMM yyyy")}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-muted-foreground uppercase">End</span>
          <span className="text-xs font-mono font-semibold">
            {format(endDate, "dd MMM yyyy")}
          </span>
        </div>
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
