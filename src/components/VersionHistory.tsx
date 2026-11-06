"use client";

import React from "react";
import { History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VersionSnapshot } from "@/lib/supabase/types";

interface VersionHistoryProps {
  snapshots: VersionSnapshot[];
  currentVersion: number;
  onRestore: (snapshot: VersionSnapshot) => void;
}

export default function VersionHistory({
  snapshots,
  currentVersion,
  onRestore,
}: VersionHistoryProps) {
  if (snapshots.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        אין גרסאות שמורות עדיין
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
        <History className="w-4 h-4" />
        היסטוריית גרסאות
      </div>

      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
        {[...snapshots].reverse().map((snap) => (
          <div
            key={snap.version}
            className={`flex items-center justify-between p-2.5 rounded-lg border text-sm transition-colors ${
              snap.version === currentVersion
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/40 border-border hover:bg-muted/60 text-foreground"
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">גרסה {snap.version}</span>
              {snap.description && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {snap.description}
                </span>
              )}
            </div>

            {snap.version !== currentVersion && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => onRestore(snap)}
              >
                <RotateCcw className="w-3 h-3" />
                שחזר
              </Button>
            )}

            {snap.version === currentVersion && (
              <span className="text-xs font-medium">נוכחי</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
