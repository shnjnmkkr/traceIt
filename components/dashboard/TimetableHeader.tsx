"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TimetableHeaderProps {
  initialName: string;
  semester?: string;
  section?: string;
  onNameChange?: (newName: string) => void;
}

export function TimetableHeader({ 
  initialName, 
  semester, 
  section,
  onNameChange 
}: TimetableHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [tempName, setTempName] = useState(initialName);

  const handleSave = () => {
    setName(tempName);
    if (onNameChange) {
      onNameChange(tempName);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempName(name);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mb-4"
    >
      <div className="flex items-center gap-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="bg-muted rounded px-3 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSave}
              className="h-7 w-7"
            >
              <Check className="w-3.5 h-3.5 text-success" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancel}
              className="h-7 w-7"
            >
              <X className="w-3.5 h-3.5 text-error" />
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-base font-semibold font-mono flex items-center gap-2 uppercase tracking-wider">
              {name}
            </h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          </>
        )}
        
        {semester && <Badge variant="outline" className="text-xs font-mono">SEM {semester}</Badge>}
        {section && <Badge variant="outline" className="text-xs font-mono">{section}</Badge>}
      </div>
    </motion.div>
  );
}
