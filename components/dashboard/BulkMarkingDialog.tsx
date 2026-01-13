"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "attended", label: "All Present", color: "bg-success" },
  { value: "absent", label: "On Leave", color: "bg-error" },
  { value: "bunk", label: "Mass Bunked", color: "bg-warning" },
  { value: "holiday", label: "Holiday", color: "bg-info" },
];

interface BulkMarkingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkMark: (date: string, status: string) => void;
}

export function BulkMarkingDialog({ isOpen, onClose, onBulkMark }: BulkMarkingDialogProps) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedStatus, setSelectedStatus] = useState("");

  const handleMark = () => {
    if (selectedDate && selectedStatus) {
      onBulkMark(selectedDate, selectedStatus);
      setSelectedStatus("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md"
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="font-mono font-semibold uppercase text-lg">
                      Mark Entire Day
                    </h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-5">
                  {/* Date Picker */}
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase tracking-wider">
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-muted rounded-lg px-4 py-3 text-sm font-mono border border-border focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Status Selection */}
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-3 block uppercase tracking-wider">
                      Mark All Classes As
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {STATUS_OPTIONS.map((option) => (
                        <motion.button
                          key={option.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedStatus(option.value)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedStatus === option.value
                              ? `${option.color} border-foreground text-foreground shadow-lg`
                              : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-bold uppercase">
                              {option.label}
                            </span>
                            {selectedStatus === option.value && (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </div>
                          <div className={`w-full h-1.5 rounded-full mt-2 ${option.color} opacity-60`} />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Info Text */}
                  {selectedStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-primary/10 border border-primary/30 rounded-lg"
                    >
                      <p className="text-xs text-muted-foreground font-mono">
                        All classes on {format(new Date(selectedDate), "MMM dd, yyyy")} will be marked as{" "}
                        <span className="text-foreground font-semibold">
                          {STATUS_OPTIONS.find(o => o.value === selectedStatus)?.label}
                        </span>
                      </p>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1 font-mono"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleMark}
                      disabled={!selectedDate || !selectedStatus}
                      className="flex-1 font-mono"
                    >
                      Apply to All Classes
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
