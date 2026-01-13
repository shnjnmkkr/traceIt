"use client";

import { format, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface WeekSelectorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export function WeekSelector({ 
  currentDate, 
  onDateChange,
  onPreviousWeek, 
  onNextWeek, 
  onToday 
}: WeekSelectorProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday

  const isCurrentWeek = () => {
    const today = new Date();
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    return format(weekStart, "yyyy-MM-dd") === format(todayWeekStart, "yyyy-MM-dd");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span className="font-mono">
          {format(weekStart, "MMM dd")} - {format(weekEnd, "MMM dd, yyyy")}
        </span>
        {isCurrentWeek() && (
          <span className="text-xs text-primary uppercase tracking-wider">(Current)</span>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousWeek}
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          onClick={onToday}
          disabled={isCurrentWeek()}
          className="h-8 px-3 text-xs font-mono uppercase tracking-wider"
        >
          Today
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onNextWeek}
          className="h-8 w-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
