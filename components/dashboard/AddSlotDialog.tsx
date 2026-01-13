"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddSlotDialogProps {
  day: number;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { subject: string; subjectName: string; type: "lecture" | "lab" }) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function AddSlotDialog({ day, startTime, endTime, isOpen, onClose, onSave }: AddSlotDialogProps) {
  const [subject, setSubject] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [type, setType] = useState<"lecture" | "lab">("lecture");

  const handleSave = () => {
    if (subject && subjectName) {
      onSave({ subject, subjectName, type });
      setSubject("");
      setSubjectName("");
      setType("lecture");
      onClose();
    }
  };

  const handleClose = () => {
    setSubject("");
    setSubjectName("");
    setType("lecture");
    onClose();
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto w-full max-w-md"
            >
              <div className="bg-card border-2 border-primary rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-border bg-primary/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold font-mono">Add Class</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {DAYS[day]} • {startTime} - {endTime}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="h-8 w-8 -mr-2 -mt-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="Subject"
                      autoFocus
                      className="w-full bg-background rounded px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                      Code
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Code"
                      className="w-full bg-background rounded px-3 py-2 text-sm font-mono font-bold border border-border focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                      Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setType("lecture")}
                        className={`flex-1 px-4 py-2 text-sm rounded border-2 transition-all ${
                          type === "lecture"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        Lecture
                      </button>
                      <button
                        onClick={() => setType("lab")}
                        className={`flex-1 px-4 py-2 text-sm rounded border-2 transition-all ${
                          type === "lab"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        Lab
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex gap-2">
                  <Button variant="ghost" onClick={handleClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!subject || !subjectName}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Add Class
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
