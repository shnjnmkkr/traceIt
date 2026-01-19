"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InvertedModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEnable: () => void;
  onSkip: () => void;
}

export function InvertedModeDialog({ isOpen, onClose, onEnable, onSkip }: InvertedModeDialogProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <Card className="border-2 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold">Inverted Mode</h2>
                <p className="text-xs text-muted-foreground">Optional attendance tracking method</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Inverted mode starts with 100% attendance. Instead of marking classes you attended, you mark absents, bunks, and other missed classes. Unmarked classes count as attended.
            </p>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs font-mono font-semibold mb-2">Normal Mode:</p>
              <p className="text-xs text-muted-foreground">Mark presents → Unmarked = absent</p>
              <p className="text-xs font-mono font-semibold mb-2 mt-3">Inverted Mode:</p>
              <p className="text-xs text-muted-foreground">Mark absents → Unmarked = attended</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1 font-mono"
            >
              Skip
            </Button>
            <Button
              onClick={onEnable}
              className="flex-1 font-mono gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Enable Inverted Mode
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
