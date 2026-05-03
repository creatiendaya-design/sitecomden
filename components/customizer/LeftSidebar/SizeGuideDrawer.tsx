// components/customizer/LeftSidebar/SizeGuideDrawer.tsx
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";

// Legacy type — kept inline because the shared SizeGuide type was moved to
// lib/size-guides/types.ts. This component is no longer used (replaced by
// SizeGuideModal) and will be deleted in Phase 8.
interface SizeGuide {
  unit: "cm" | "in";
  columns: { key: string; label: string }[];
  rows: { size: string; values: Record<string, number> }[];
  notes?: string;
}

interface Props {
  guide: SizeGuide;
  onClose: () => void;
}

export function SizeGuideDrawer({ guide, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <h3 className="font-semibold mb-3">Guía de tallas ({guide.unit})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2">Talla</th>
                {guide.columns.map((c) => (
                  <th key={c.key} className="text-left p-2">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((r) => (
                <tr key={r.size} className="border-b">
                  <td className="p-2 font-medium">{r.size}</td>
                  {guide.columns.map((c) => (
                    <td key={c.key} className="p-2">
                      {r.values[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {guide.notes && (
          <p className="text-xs text-muted-foreground mt-3">{guide.notes}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
