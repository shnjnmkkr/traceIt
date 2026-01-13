"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResizableLeftPanelProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function ResizableLeftPanel({ children, onClose }: ResizableLeftPanelProps) {
  const [width, setWidth] = useState(280); // Increased from 220
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const MIN_WIDTH = 240;
  const MAX_WIDTH = 400;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  return (
    <motion.aside
      ref={panelRef}
      initial={{ x: -width, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -width, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      style={{ width: `${width}px` }}
      className="hidden lg:block border-r border-border overflow-y-auto relative flex-shrink-0"
    >
      {/* Close Button - Mobile/Tablet */}
      <div className="lg:hidden absolute top-4 right-4 z-10">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="h-full">
        {children}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          absolute top-0 right-0 w-1 h-full cursor-ew-resize 
          hover:bg-primary/50 transition-colors group
          ${isResizing ? "bg-primary" : "bg-transparent"}
        `}
      >
        <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-muted border border-border rounded p-1">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
