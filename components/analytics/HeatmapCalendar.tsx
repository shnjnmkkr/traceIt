"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { getStatusColor } from "@/lib/utils";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from "date-fns";

interface HeatmapCalendarProps {
  data: { date: string; status: string }[];
}

export function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getStatusForDate = (date: Date) => {
    const record = data.find((d) => isSameDay(new Date(d.date), date));
    return record?.status || null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-mono">
          <span className="text-primary">//</span> {format(today, "MMMM yyyy")} Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <div key={idx} className="text-xs text-center text-muted-foreground font-mono p-1">
              {day}
            </div>
          ))}
          
          {/* Empty cells for days before month start */}
          {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
            <div key={`empty-${idx}`} />
          ))}

          {/* Calendar days */}
          {days.map((day, idx) => {
            const status = getStatusForDate(day);
            const isToday = isSameDay(day, today);
            
            return (
              <motion.div
                key={day.toISOString()}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.01 }}
                whileHover={{ scale: 1.2, zIndex: 10 }}
                className={`
                  aspect-square rounded flex items-center justify-center text-xs
                  ${isToday ? "ring-2 ring-primary" : ""}
                  ${status ? "font-semibold" : ""}
                `}
                style={{
                  backgroundColor: status ? `${getStatusColor(status)}40` : "#1a1a1a",
                  borderWidth: status ? 2 : 1,
                  borderColor: status ? getStatusColor(status) : "#262626",
                }}
                title={status ? `${format(day, "MMM d")}: ${status}` : format(day, "MMM d")}
              >
                {format(day, "d")}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
