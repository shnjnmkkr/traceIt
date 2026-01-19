"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface ExploreAboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExploreAboutDialog({ isOpen, onClose }: ExploreAboutDialogProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleExploreAbout = () => {
    router.push('/about');
    onClose();
  };

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
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-mono font-bold">Welcome to traceIt!</h2>
                <p className="text-xs text-muted-foreground">Your timetable is ready</p>
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
              Your timetable has been created successfully! Explore the About page to learn about all the features and how attendance calculations work.
            </p>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs font-mono font-semibold mb-2">What you'll learn:</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 ml-4 list-disc">
                <li>How attendance is calculated</li>
                <li>Inverted mode and other customizable settings</li>
                <li>How to mark attendance and use bulk marking</li>
                <li>Analytics and AI advisor features</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 font-mono"
            >
              Skip
            </Button>
            <Button
              onClick={handleExploreAbout}
              className="flex-1 font-mono gap-2"
            >
              Explore About Page
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
