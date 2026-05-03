// components/shop/size-guide/SizeGuideTabContent.tsx
import Image from "next/image";
import type { SizeGuideTab } from "@/lib/size-guides/types";

interface Props {
  tab: SizeGuideTab;
}

export function SizeGuideTabContent({ tab }: Props) {
  return (
    <div className="space-y-4">
      {tab.intro && (
        <p
          className="text-sm text-muted-foreground"
          style={{ whiteSpace: "pre-line" }}
        >
          {tab.intro}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-[280px_1fr] items-start">
        {tab.imageUrl && (
          <div className="relative aspect-square bg-slate-100 rounded">
            <Image
              src={tab.imageUrl}
              alt={tab.title}
              fill
              className="object-contain p-2"
            />
          </div>
        )}

        {tab.markers.length > 0 && (
          <div className="space-y-3">
            {tab.markers.map((m, i) => (
              <div key={i}>
                <h4 className="font-semibold text-sm">
                  {m.key} {m.label}
                </h4>
                <p
                  className="text-sm text-muted-foreground"
                  style={{ whiteSpace: "pre-line" }}
                >
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
