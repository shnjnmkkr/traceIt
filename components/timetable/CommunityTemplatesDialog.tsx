"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CommunityTemplates } from "./CommunityTemplates";

interface CommunityTemplatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdoptTemplate: (template: any) => Promise<void> | void;
}

export function CommunityTemplatesDialog({
  isOpen,
  onClose,
  onAdoptTemplate,
}: CommunityTemplatesDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isAdopting, setIsAdopting] = useState(false);

  if (!isOpen) return null;

  const handleConfirmAdopt = async () => {
    if (!selectedTemplate) return;
    setIsAdopting(true);
    try {
      await onAdoptTemplate(selectedTemplate);
      setSelectedTemplate(null);
      onClose();
    } catch (error) {
      console.error("Error adopting template:", error);
    } finally {
      setIsAdopting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <Card
          className="w-full max-w-2xl h-[75vh] sm:h-[600px] max-h-[85vh] flex flex-col overflow-hidden relative border-2 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-mono font-bold">Adopt Community Template</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <CommunityTemplates
              onSelectTemplate={(template) => setSelectedTemplate(template)}
            />
          </div>

          {/* Confirmation Overlay */}
          {selectedTemplate && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center p-4">
              <Card className="max-w-md w-full p-6 space-y-4 border-2 border-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-base">Adopt Template?</h3>
                    <p className="text-xs text-muted-foreground">{selectedTemplate.name}</p>
                  </div>
                </div>

                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning leading-relaxed">
                    Adopting this template will replace your current active timetable.
                  </p>
                </div>

                <div className="space-y-1 text-xs font-mono bg-muted p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">University:</span>
                    <span>{selectedTemplate.university || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Course / Sem:</span>
                    <span>{selectedTemplate.course || ""} {selectedTemplate.semester || ""}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creator:</span>
                    <span>{selectedTemplate.creator_name || "Anonymous"}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTemplate(null)}
                    disabled={isAdopting}
                    className="flex-1 font-mono text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmAdopt}
                    disabled={isAdopting}
                    className="flex-1 font-mono text-xs gap-2"
                  >
                    {isAdopting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adopting...
                      </>
                    ) : (
                      <>
                        Confirm & Adopt
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
