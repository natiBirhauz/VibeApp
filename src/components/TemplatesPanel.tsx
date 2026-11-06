"use client";

import React from "react";
import { STARTER_TEMPLATES, type StarterTemplate } from "@/lib/templates/starters";

interface TemplatesPanelProps {
  onSelect: (template: StarterTemplate) => void;
}

export default function TemplatesPanel({ onSelect }: TemplatesPanelProps) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-xs text-muted-foreground mb-1">
        בחר תבנית מוכנה — עריכות עולות 2 קרדיטים בלבד
      </p>
      <div className="grid grid-cols-1 gap-2">
        {STARTER_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => onSelect(tmpl)}
            className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 transition-all text-right group"
          >
            <span className="text-2xl mt-0.5 flex-shrink-0">{tmpl.icon}</span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                {tmpl.nameHe}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {tmpl.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
