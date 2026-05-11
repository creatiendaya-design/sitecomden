// components/shop/size-guide/SizeGuideModal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SizeGuideTabContent } from "./SizeGuideTabContent";
import { SizeGuideTable } from "./SizeGuideTable";
import type { SizeGuideData } from "@/lib/size-guides/types";

interface Props {
  guide: SizeGuideData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SizeGuideModal({ guide, open, onOpenChange }: Props) {
  const [activeTabId, setActiveTabId] = useState<string | null>(
    guide.tabs[0]?.id ?? null,
  );
  const activeTab =
    guide.tabs.find((t) => t.id === activeTabId) ?? guide.tabs[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-[640px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold border-b pb-3">Guía de tallas</h2>

        {guide.tabs.length > 1 && (
          <div className="flex gap-4 border-b -mx-6 px-6 text-sm">
            {guide.tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTabId(t.id)}
                className={
                  activeTab?.id === t.id
                    ? "py-2 border-b-2 border-foreground font-semibold"
                    : "py-2 text-muted-foreground"
                }
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        {activeTab && (
          <div className="py-4">
            <h3 className="font-semibold mb-3">{activeTab.title}</h3>
            <SizeGuideTabContent tab={activeTab} />
          </div>
        )}

        {guide.table.rows.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Encuentra tu talla</h3>
            <SizeGuideTable table={guide.table} primaryUnit={guide.unit} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
