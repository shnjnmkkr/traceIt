"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIChatPanel } from "./AIChatPanel";

interface ResizableAIPanelProps {
  onClose: () => void;
}

export function ResizableAIPanel({ onClose }: ResizableAIPanelProps) {
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 260 && newWidth <= 800) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  return (
    <motion.aside
      ref={panelRef}
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      style={{ width: `${width}px` }}
      className="relative border-l border-border flex flex-col bg-background"
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          absolute left-0 top-0 bottom-0 w-1 cursor-col-resize
          hover:bg-primary/50 transition-colors z-20
          ${isResizing ? "bg-primary" : ""}
        `}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Close button */}
      <div className="absolute right-2 top-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Chat panel */}
      <div className="flex-1 overflow-hidden">
        <AIChatPanel />
      </div>
    </motion.aside>
  );
}
