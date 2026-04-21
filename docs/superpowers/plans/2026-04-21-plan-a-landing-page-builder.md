# Landing Page Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-product page builder so admins can compose reorderable content blocks (Hero, Benefits, Gallery, Testimonials, Video, Ticker/Countdown, Colors) on Landing Page template products.

**Architecture:** A new `LandingBlock` Prisma model stores each block as a typed row with a `position` integer and a `content` JSON field. Admin UI in the product form renders a drag-and-drop block list using `@dnd-kit/sortable`. The frontend renders blocks via a `LandingBlockRenderer` component that switches on `type`.

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL (Neon), `@dnd-kit/sortable`, Tailwind CSS v4, shadcn/ui (Radix UI), TypeScript, Server Actions, Vercel Blob (image upload), Zod 4, `date-fns`

> **Note:** This project has no automated tests. Each task ends with a manual verification step.

---

## File Map

**New files:**
- `prisma/migrations/<timestamp>_add_landing_blocks/migration.sql`
- `lib/types/landing-blocks.ts` — TypeScript types for all block content shapes
- `actions/landing-blocks.ts` — Server Actions: createBlock, updateBlock, deleteBlock, reorderBlocks
- `components/admin/landing-builder/LandingBlockList.tsx` — dnd-kit sortable block list
- `components/admin/landing-builder/AddBlockMenu.tsx` — dropdown to pick new block type
- `components/admin/landing-builder/block-forms/HeroBlockForm.tsx`
- `components/admin/landing-builder/block-forms/BenefitsBlockForm.tsx`
- `components/admin/landing-builder/block-forms/GalleryBlockForm.tsx`
- `components/admin/landing-builder/block-forms/TestimonialsBlockForm.tsx`
- `components/admin/landing-builder/block-forms/VideoBlockForm.tsx`
- `components/admin/landing-builder/block-forms/ColorsBlockForm.tsx`
- `components/admin/landing-builder/block-forms/TickerBlockForm.tsx`
- `components/shop/templates/blocks/LandingBlockRenderer.tsx`
- `components/shop/templates/blocks/HeroBlock.tsx`
- `components/shop/templates/blocks/BenefitsBlock.tsx`
- `components/shop/templates/blocks/GalleryBlock.tsx` — slider (lightbox + centered thumbnails) + stacked
- `components/shop/templates/blocks/TestimonialsBlock.tsx`
- `components/shop/templates/blocks/VideoBlock.tsx` — custom player (click to play, sound icon)
- `components/shop/templates/blocks/ColorsBlock.tsx`
- `components/shop/templates/blocks/TickerBlock.tsx` — scrolling | countdown | sticky
- `components/shop/GalleryLightbox.tsx` — portal-based image zoom

**Modified files:**
- `prisma/schema.prisma` — add `LandingBlock` model, `LandingBlockType` enum
- `app/(shop)/productos/[slug]/page.tsx` — fetch `landingBlocks`, pass to template
- `components/shop/templates/ProductLandingView.tsx` — delegate to `LandingBlockRenderer`
- `components/admin/EditProductForm.tsx` — add `LandingBlockList` in Presentación card
- `components/admin/NewProductForm.tsx` — add `LandingBlockList` in Presentación card

---

## Task 1: Prisma Schema — LandingBlock model

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npx prisma migrate dev`

- [ ] **Step 1: Add enum and model to schema**

Open `prisma/schema.prisma`. After the `ProductTemplate` enum, add:

```prisma
enum LandingBlockType {
  HERO
  BENEFITS
  GALLERY
  TESTIMONIALS
  VIDEO
  COLORS
  TICKER
}
```

On the `Product` model, add one line inside the model body (after `updatedAt`):

```prisma
  landingBlocks    LandingBlock[]
```

After the `ProductTemplate` enum block, add the new model:

```prisma
model LandingBlock {
  id        String           @id @default(cuid())
  productId String
  product   Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  type      LandingBlockType
  position  Int
  content   Json             @default("{}")
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@index([productId, position])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_landing_blocks
```

Expected: migration file created, Prisma client regenerated, no errors.

- [ ] **Step 3: Verify in Prisma Studio**

```bash
npx prisma studio
```

Open browser at `http://localhost:5555`, confirm `LandingBlock` table exists.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add LandingBlock model and LandingBlockType enum"
```

---

## Task 2: TypeScript types for block content

**Files:**
- Create: `lib/types/landing-blocks.ts`

- [ ] **Step 1: Create the types file**

```typescript
// lib/types/landing-blocks.ts

export type LandingBlockType =
  | "HERO"
  | "BENEFITS"
  | "GALLERY"
  | "TESTIMONIALS"
  | "VIDEO"
  | "COLORS"
  | "TICKER";

export interface HeroBlockContent {
  title: string;
  subtitle?: string;
  bgImage?: string;
  overlayColor?: string;
  ctaText?: string;
}

export interface BenefitCard {
  icon: string;
  title: string;
  description: string;
}

export interface BenefitsBlockContent {
  cards: BenefitCard[];
}

export interface GalleryBlockContent {
  displayType: "slider" | "stacked";
  images: string[];
  showBuyButton: boolean;
}

export interface TestimonialItem {
  name: string;
  photo?: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface TestimonialsBlockContent {
  items: TestimonialItem[];
}

export interface VideoItem {
  url: string;
  title?: string;
  provider: "youtube" | "vimeo" | "upload";
}

export interface VideoBlockContent {
  displayType: "slider" | "stacked";
  videos: VideoItem[];
  showBuyButton: boolean;
}

export interface ColorsBlockContent {
  primary?: string;
  background?: string;
  cta?: string;
  text?: string;
}

export type TickerMode = "scrolling" | "countdown" | "both";

export interface TickerBlockContent {
  mode: TickerMode;
  sticky: boolean;
  scrollingText?: string;
  speed?: number;
  endsAt?: string;
  countdownLabel?: string;
  bgColor?: string;
  textColor?: string;
}

export type BlockContent =
  | HeroBlockContent
  | BenefitsBlockContent
  | GalleryBlockContent
  | TestimonialsBlockContent
  | VideoBlockContent
  | ColorsBlockContent
  | TickerBlockContent;

export interface LandingBlock {
  id: string;
  productId: string;
  type: LandingBlockType;
  position: number;
  content: BlockContent;
  createdAt: Date;
  updatedAt: Date;
}

export const BLOCK_TYPE_LABELS: Record<LandingBlockType, string> = {
  HERO: "Hero / Cabecera",
  BENEFITS: "Beneficios",
  GALLERY: "Galería",
  TESTIMONIALS: "Testimonios",
  VIDEO: "Video",
  COLORS: "Colores",
  TICKER: "Ticker / Contador",
};

export const BLOCK_DEFAULT_CONTENT: Record<LandingBlockType, BlockContent> = {
  HERO: { title: "Título del hero", subtitle: "", bgImage: "", overlayColor: "rgba(0,0,0,0.3)", ctaText: "Comprar ahora" },
  BENEFITS: { cards: [{ icon: "✅", title: "Beneficio", description: "Descripción del beneficio" }] },
  GALLERY: { displayType: "slider", images: [], showBuyButton: false },
  TESTIMONIALS: { items: [{ name: "Cliente", text: "Excelente producto", rating: 5 }] },
  VIDEO: { displayType: "slider", videos: [], showBuyButton: false },
  COLORS: { primary: "#3b82f6", background: "#ffffff", cta: "#dc2626", text: "#111827" },
  TICKER: { mode: "scrolling", sticky: false, scrollingText: "🔥 Oferta especial • Envío gratis •", speed: 30, bgColor: "#dc2626", textColor: "#ffffff" },
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/landing-blocks.ts
git commit -m "feat: add TypeScript types for landing block content"
```

---

## Task 3: Server Actions for LandingBlock CRUD

**Files:**
- Create: `actions/landing-blocks.ts`

- [ ] **Step 1: Create server actions file**

```typescript
// actions/landing-blocks.ts
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { protectRoute } from "@/lib/protect-route";
import type { LandingBlockType, BlockContent } from "@/lib/types/landing-blocks";

export async function createLandingBlock(
  productId: string,
  type: LandingBlockType,
  content: BlockContent
) {
  await protectRoute("products:update");

  const maxPosition = await prisma.landingBlock.findFirst({
    where: { productId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const block = await prisma.landingBlock.create({
    data: {
      productId,
      type,
      position: (maxPosition?.position ?? -1) + 1,
      content: content as object,
    },
  });

  revalidatePath(`/admin/productos`);
  return { success: true, block };
}

export async function updateLandingBlock(
  blockId: string,
  content: BlockContent
) {
  await protectRoute("products:update");

  const block = await prisma.landingBlock.update({
    where: { id: blockId },
    data: { content: content as object },
  });

  revalidatePath(`/admin/productos`);
  return { success: true, block };
}

export async function deleteLandingBlock(blockId: string) {
  await protectRoute("products:update");

  await prisma.landingBlock.delete({ where: { id: blockId } });

  revalidatePath(`/admin/productos`);
  return { success: true };
}

export async function reorderLandingBlocks(
  blocks: { id: string; position: number }[]
) {
  await protectRoute("products:update");

  await prisma.$transaction(
    blocks.map(({ id, position }) =>
      prisma.landingBlock.update({ where: { id }, data: { position } })
    )
  );

  revalidatePath(`/admin/productos`);
  return { success: true };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors related to `actions/landing-blocks.ts`.

- [ ] **Step 3: Commit**

```bash
git add actions/landing-blocks.ts
git commit -m "feat: add server actions for landing block CRUD"
```

---

## Task 4: Admin — AddBlockMenu component

**Files:**
- Create: `components/admin/landing-builder/AddBlockMenu.tsx`

- [ ] **Step 1: Create the add-block dropdown**

```typescript
// components/admin/landing-builder/AddBlockMenu.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { BLOCK_TYPE_LABELS, type LandingBlockType } from "@/lib/types/landing-blocks";

const BLOCK_ICONS: Record<LandingBlockType, string> = {
  HERO: "🖼",
  BENEFITS: "✅",
  GALLERY: "🖼️",
  TESTIMONIALS: "💬",
  VIDEO: "▶️",
  COLORS: "🎨",
  TICKER: "📢",
};

interface AddBlockMenuProps {
  onAdd: (type: LandingBlockType) => void;
  disabled?: boolean;
}

const BLOCK_TYPES: LandingBlockType[] = [
  "HERO", "BENEFITS", "GALLERY", "TESTIMONIALS", "VIDEO", "COLORS", "TICKER",
];

export default function AddBlockMenu({ onAdd, disabled }: AddBlockMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar sección
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {BLOCK_TYPES.map((type) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
            <span className="mr-2">{BLOCK_ICONS[type]}</span>
            {BLOCK_TYPE_LABELS[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/landing-builder/AddBlockMenu.tsx
git commit -m "feat: add AddBlockMenu component for landing builder"
```

---

## Task 5: Admin — Block form components (all 7 types)

**Files:**
- Create: `components/admin/landing-builder/block-forms/HeroBlockForm.tsx`
- Create: `components/admin/landing-builder/block-forms/BenefitsBlockForm.tsx`
- Create: `components/admin/landing-builder/block-forms/GalleryBlockForm.tsx`
- Create: `components/admin/landing-builder/block-forms/TestimonialsBlockForm.tsx`
- Create: `components/admin/landing-builder/block-forms/VideoBlockForm.tsx`
- Create: `components/admin/landing-builder/block-forms/ColorsBlockForm.tsx`
- Create: `components/admin/landing-builder/block-forms/TickerBlockForm.tsx`

- [ ] **Step 1: HeroBlockForm**

```typescript
// components/admin/landing-builder/block-forms/HeroBlockForm.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HeroBlockContent } from "@/lib/types/landing-blocks";

interface HeroBlockFormProps {
  content: HeroBlockContent;
  onChange: (content: HeroBlockContent) => void;
}

export default function HeroBlockForm({ content, onChange }: HeroBlockFormProps) {
  const update = (field: keyof HeroBlockContent, value: string) =>
    onChange({ ...content, [field]: value });

  return (
    <div className="space-y-3">
      <div>
        <Label>Título</Label>
        <Input value={content.title} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div>
        <Label>Subtítulo</Label>
        <Input value={content.subtitle ?? ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>
      <div>
        <Label>Imagen de fondo (URL)</Label>
        <Input value={content.bgImage ?? ""} onChange={(e) => update("bgImage", e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <Label>Color de overlay</Label>
        <Input value={content.overlayColor ?? "rgba(0,0,0,0.3)"} onChange={(e) => update("overlayColor", e.target.value)} placeholder="rgba(0,0,0,0.3)" />
      </div>
      <div>
        <Label>Texto del botón CTA</Label>
        <Input value={content.ctaText ?? ""} onChange={(e) => update("ctaText", e.target.value)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: BenefitsBlockForm**

```typescript
// components/admin/landing-builder/block-forms/BenefitsBlockForm.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import type { BenefitsBlockContent, BenefitCard } from "@/lib/types/landing-blocks";

interface BenefitsBlockFormProps {
  content: BenefitsBlockContent;
  onChange: (content: BenefitsBlockContent) => void;
}

export default function BenefitsBlockForm({ content, onChange }: BenefitsBlockFormProps) {
  const updateCard = (index: number, field: keyof BenefitCard, value: string) => {
    const cards = content.cards.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    onChange({ ...content, cards });
  };

  const addCard = () =>
    onChange({ ...content, cards: [...content.cards, { icon: "✅", title: "", description: "" }] });

  const removeCard = (index: number) =>
    onChange({ ...content, cards: content.cards.filter((_, i) => i !== index) });

  return (
    <div className="space-y-3">
      {content.cards.map((card, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">Card {i + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCard(i)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">Ícono</Label>
              <Input value={card.icon} onChange={(e) => updateCard(i, "icon", e.target.value)} className="text-center text-lg" />
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Título</Label>
              <Input value={card.title} onChange={(e) => updateCard(i, "title", e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Descripción</Label>
            <Input value={card.description} onChange={(e) => updateCard(i, "description", e.target.value)} />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addCard} className="w-full">
        <Plus className="h-3 w-3 mr-1" /> Agregar card
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: GalleryBlockForm**

```typescript
// components/admin/landing-builder/block-forms/GalleryBlockForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import type { GalleryBlockContent } from "@/lib/types/landing-blocks";

interface GalleryBlockFormProps {
  content: GalleryBlockContent;
  onChange: (content: GalleryBlockContent) => void;
}

export default function GalleryBlockForm({ content, onChange }: GalleryBlockFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.url as string;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const urls = await Promise.all(Array.from(files).map(uploadImage));
    onChange({ ...content, images: [...content.images, ...urls] });
  };

  const removeImage = (index: number) =>
    onChange({ ...content, images: content.images.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Label>Tipo de display</Label>
        <div className="flex gap-2">
          {(["slider", "stacked"] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChange({ ...content, displayType: type })}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
                content.displayType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background"
              }`}
            >
              {type === "slider" ? "Slider" : "Apilado"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={content.showBuyButton}
          onCheckedChange={(v) => onChange({ ...content, showBuyButton: v })}
        />
        <Label>Mostrar botón "Comprar ahora"</Label>
      </div>

      <div>
        <Label className="mb-2 block">Imágenes</Label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {content.images.map((url, i) => (
            <div key={i} className="relative aspect-square rounded border overflow-hidden group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3 w-3 mr-1" /> Subir imágenes
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: TestimonialsBlockForm**

```typescript
// components/admin/landing-builder/block-forms/TestimonialsBlockForm.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import type { TestimonialsBlockContent, TestimonialItem } from "@/lib/types/landing-blocks";

interface TestimonialsBlockFormProps {
  content: TestimonialsBlockContent;
  onChange: (content: TestimonialsBlockContent) => void;
}

export default function TestimonialsBlockForm({ content, onChange }: TestimonialsBlockFormProps) {
  const updateItem = (index: number, field: keyof TestimonialItem, value: string | number) => {
    const items = content.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange({ ...content, items });
  };

  const addItem = () =>
    onChange({ ...content, items: [...content.items, { name: "", text: "", rating: 5 as const }] });

  const removeItem = (index: number) =>
    onChange({ ...content, items: content.items.filter((_, i) => i !== index) });

  return (
    <div className="space-y-3">
      {content.items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">Testimonio {i + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(i)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Calificación (1-5)</Label>
              <Input type="number" min={1} max={5} value={item.rating} onChange={(e) => updateItem(i, "rating", Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Testimonio</Label>
            <Textarea value={item.text} onChange={(e) => updateItem(i, "text", e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="text-xs">Foto URL (opcional)</Label>
            <Input value={item.photo ?? ""} onChange={(e) => updateItem(i, "photo", e.target.value)} placeholder="https://..." />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="h-3 w-3 mr-1" /> Agregar testimonio
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: VideoBlockForm**

```typescript
// components/admin/landing-builder/block-forms/VideoBlockForm.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type { VideoBlockContent, VideoItem } from "@/lib/types/landing-blocks";

interface VideoBlockFormProps {
  content: VideoBlockContent;
  onChange: (content: VideoBlockContent) => void;
}

export default function VideoBlockForm({ content, onChange }: VideoBlockFormProps) {
  const updateVideo = (index: number, field: keyof VideoItem, value: string) => {
    const videos = content.videos.map((v, i) =>
      i === index ? { ...v, [field]: value } : v
    );
    onChange({ ...content, videos });
  };

  const addVideo = () =>
    onChange({ ...content, videos: [...content.videos, { url: "", title: "", provider: "youtube" as const }] });

  const removeVideo = (index: number) =>
    onChange({ ...content, videos: content.videos.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Label>Tipo de display</Label>
        <div className="flex gap-2">
          {(["slider", "stacked"] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChange({ ...content, displayType: type })}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
                content.displayType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background"
              }`}
            >
              {type === "slider" ? "Slider (3 por slide)" : "Apilado"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={content.showBuyButton}
          onCheckedChange={(v) => onChange({ ...content, showBuyButton: v })}
        />
        <Label>Mostrar botón "Comprar ahora"</Label>
      </div>

      <div className="space-y-3">
        {content.videos.map((video, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground">Video {i + 1}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeVideo(i)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
            <div>
              <Label className="text-xs">Proveedor</Label>
              <Select value={video.provider} onValueChange={(v) => updateVideo(i, "provider", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="vimeo">Vimeo</SelectItem>
                  <SelectItem value="upload">Archivo propio (URL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">URL del video</Label>
              <Input value={video.url} onChange={(e) => updateVideo(i, "url", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">Título (opcional)</Label>
              <Input value={video.title ?? ""} onChange={(e) => updateVideo(i, "title", e.target.value)} className="text-xs" />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addVideo} className="w-full">
          <Plus className="h-3 w-3 mr-1" /> Agregar video
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: ColorsBlockForm**

```typescript
// components/admin/landing-builder/block-forms/ColorsBlockForm.tsx
"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ColorsBlockContent } from "@/lib/types/landing-blocks";

interface ColorsBlockFormProps {
  content: ColorsBlockContent;
  onChange: (content: ColorsBlockContent) => void;
}

const COLOR_FIELDS: { key: keyof ColorsBlockContent; label: string }[] = [
  { key: "primary", label: "Color primario" },
  { key: "background", label: "Fondo de secciones" },
  { key: "cta", label: "Color de botones CTA" },
  { key: "text", label: "Color de texto" },
];

export default function ColorsBlockForm({ content, onChange }: ColorsBlockFormProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {COLOR_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <Label className="text-xs">{label}</Label>
          <div className="flex gap-2 mt-1 items-center">
            <input
              type="color"
              value={content[key] ?? "#000000"}
              onChange={(e) => onChange({ ...content, [key]: e.target.value })}
              className="h-8 w-10 rounded border cursor-pointer p-0.5"
            />
            <Input
              value={content[key] ?? ""}
              onChange={(e) => onChange({ ...content, [key]: e.target.value })}
              className="text-xs h-8"
              placeholder="#000000"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: TickerBlockForm**

```typescript
// components/admin/landing-builder/block-forms/TickerBlockForm.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TickerBlockContent, TickerMode } from "@/lib/types/landing-blocks";

interface TickerBlockFormProps {
  content: TickerBlockContent;
  onChange: (content: TickerBlockContent) => void;
}

export default function TickerBlockForm({ content, onChange }: TickerBlockFormProps) {
  const update = <K extends keyof TickerBlockContent>(key: K, value: TickerBlockContent[K]) =>
    onChange({ ...content, [key]: value });

  const showScrolling = content.mode === "scrolling" || content.mode === "both";
  const showCountdown = content.mode === "countdown" || content.mode === "both";

  return (
    <div className="space-y-3">
      <div>
        <Label>Modo</Label>
        <Select value={content.mode} onValueChange={(v) => update("mode", v as TickerMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scrolling">Solo texto scrolling</SelectItem>
            <SelectItem value="countdown">Solo contador regresivo</SelectItem>
            <SelectItem value="both">Texto scrolling + Contador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={content.sticky} onCheckedChange={(v) => update("sticky", v)} />
        <Label>Sticky (fijo en el encabezado)</Label>
      </div>

      {showScrolling && (
        <>
          <div>
            <Label>Texto scrolling</Label>
            <Input value={content.scrollingText ?? ""} onChange={(e) => update("scrollingText", e.target.value)} placeholder="🔥 Oferta del día • Envío gratis •" />
          </div>
          <div>
            <Label>Velocidad (px/s)</Label>
            <Input type="number" value={content.speed ?? 30} onChange={(e) => update("speed", Number(e.target.value))} min={10} max={100} />
          </div>
        </>
      )}

      {showCountdown && (
        <>
          <div>
            <Label>Etiqueta del contador</Label>
            <Input value={content.countdownLabel ?? ""} onChange={(e) => update("countdownLabel", e.target.value)} placeholder="¡Oferta termina en:" />
          </div>
          <div>
            <Label>Fecha/hora de vencimiento</Label>
            <Input type="datetime-local" value={content.endsAt?.slice(0, 16) ?? ""} onChange={(e) => update("endsAt", new Date(e.target.value).toISOString())} />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Color de fondo</Label>
          <div className="flex gap-2 mt-1 items-center">
            <input type="color" value={content.bgColor ?? "#dc2626"} onChange={(e) => update("bgColor", e.target.value)} className="h-8 w-10 rounded border cursor-pointer p-0.5" />
            <Input value={content.bgColor ?? ""} onChange={(e) => update("bgColor", e.target.value)} className="text-xs h-8" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Color de texto</Label>
          <div className="flex gap-2 mt-1 items-center">
            <input type="color" value={content.textColor ?? "#ffffff"} onChange={(e) => update("textColor", e.target.value)} className="h-8 w-10 rounded border cursor-pointer p-0.5" />
            <Input value={content.textColor ?? ""} onChange={(e) => update("textColor", e.target.value)} className="text-xs h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit all block forms**

```bash
git add components/admin/landing-builder/block-forms/
git commit -m "feat: add all 7 landing block form components"
```

---

## Task 6: Admin — LandingBlockList (drag & drop)

**Files:**
- Create: `components/admin/landing-builder/LandingBlockList.tsx`

- [ ] **Step 1: Create the sortable block list**

```typescript
// components/admin/landing-builder/LandingBlockList.tsx
"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AddBlockMenu from "./AddBlockMenu";
import HeroBlockForm from "./block-forms/HeroBlockForm";
import BenefitsBlockForm from "./block-forms/BenefitsBlockForm";
import GalleryBlockForm from "./block-forms/GalleryBlockForm";
import TestimonialsBlockForm from "./block-forms/TestimonialsBlockForm";
import VideoBlockForm from "./block-forms/VideoBlockForm";
import ColorsBlockForm from "./block-forms/ColorsBlockForm";
import TickerBlockForm from "./block-forms/TickerBlockForm";
import {
  createLandingBlock,
  updateLandingBlock,
  deleteLandingBlock,
  reorderLandingBlocks,
} from "@/actions/landing-blocks";
import {
  BLOCK_TYPE_LABELS,
  BLOCK_DEFAULT_CONTENT,
  type LandingBlock,
  type LandingBlockType,
  type BlockContent,
} from "@/lib/types/landing-blocks";

const BLOCK_ICONS: Record<LandingBlockType, string> = {
  HERO: "🖼", BENEFITS: "✅", GALLERY: "🖼️",
  TESTIMONIALS: "💬", VIDEO: "▶️", COLORS: "🎨", TICKER: "📢",
};

const BLOCK_COLORS: Record<LandingBlockType, string> = {
  HERO: "border-l-purple-500", BENEFITS: "border-l-green-500",
  GALLERY: "border-l-blue-500", TESTIMONIALS: "border-l-blue-400",
  VIDEO: "border-l-red-500", COLORS: "border-l-yellow-500", TICKER: "border-l-amber-500",
};

interface SortableBlockItemProps {
  block: LandingBlock;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  onContentChange: (content: BlockContent) => void;
  isMobile?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function SortableBlockItem({
  block, isEditing, onToggleEdit, onDelete, onContentChange,
  isMobile, onMoveUp, onMoveDown,
}: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderForm = () => {
    switch (block.type) {
      case "HERO": return <HeroBlockForm content={block.content as any} onChange={onContentChange} />;
      case "BENEFITS": return <BenefitsBlockForm content={block.content as any} onChange={onContentChange} />;
      case "GALLERY": return <GalleryBlockForm content={block.content as any} onChange={onContentChange} />;
      case "TESTIMONIALS": return <TestimonialsBlockForm content={block.content as any} onChange={onContentChange} />;
      case "VIDEO": return <VideoBlockForm content={block.content as any} onChange={onContentChange} />;
      case "COLORS": return <ColorsBlockForm content={block.content as any} onChange={onContentChange} />;
      case "TICKER": return <TickerBlockForm content={block.content as any} onChange={onContentChange} />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={`border rounded-lg bg-card border-l-4 ${BLOCK_COLORS[block.type]}`}>
      <div className="flex items-center gap-2 p-3">
        {isMobile ? (
          <div className="flex flex-col gap-0.5">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp}><ChevronUp className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown}><ChevronDown className="h-3 w-3" /></Button>
          </div>
        ) : (
          <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        <span className="text-lg">{BLOCK_ICONS[block.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{BLOCK_TYPE_LABELS[block.type]}</div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
      {isEditing && (
        <div className="px-3 pb-3 border-t pt-3">
          {renderForm()}
          <Button size="sm" className="mt-3 w-full" onClick={onToggleEdit}>
            Guardar bloque
          </Button>
        </div>
      )}
    </div>
  );
}

interface LandingBlockListProps {
  productId: string;
  initialBlocks: LandingBlock[];
}

export default function LandingBlockList({ productId, initialBlocks }: LandingBlockListProps) {
  const [blocks, setBlocks] = useState<LandingBlock[]>(
    [...initialBlocks].sort((a, b) => a.position - b.position)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<Record<string, BlockContent>>({});
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, position: i }));
    setBlocks(reordered);

    startTransition(async () => {
      await reorderLandingBlocks(reordered.map(({ id, position }) => ({ id, position })));
    });
  };

  const handleAdd = (type: LandingBlockType) => {
    startTransition(async () => {
      const defaultContent = BLOCK_DEFAULT_CONTENT[type];
      const result = await createLandingBlock(productId, type, defaultContent);
      if (result.success) {
        const newBlock: LandingBlock = {
          ...result.block,
          type: result.block.type as LandingBlockType,
          content: defaultContent,
          createdAt: new Date(result.block.createdAt),
          updatedAt: new Date(result.block.updatedAt),
        };
        setBlocks((prev) => [...prev, newBlock]);
        setEditingId(newBlock.id);
        toast.success("Sección agregada");
      }
    });
  };

  const handleDelete = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    startTransition(async () => {
      await deleteLandingBlock(id);
      toast.success("Sección eliminada");
    });
  };

  const handleSave = (id: string) => {
    const content = pendingContent[id];
    if (!content) { setEditingId(null); return; }

    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, content } : b));
    setEditingId(null);

    startTransition(async () => {
      const result = await updateLandingBlock(id, content);
      if (result.success) toast.success("Sección guardada");
    });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const reordered = arrayMove(blocks, index, newIndex).map((b, i) => ({ ...b, position: i }));
    setBlocks(reordered);
    startTransition(async () => {
      await reorderLandingBlocks(reordered.map(({ id, position }) => ({ id, position })));
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Secciones de la Landing</p>
          <p className="text-xs text-muted-foreground">Arrastra para reordenar • Haz clic en ✏️ para editar</p>
        </div>
        <AddBlockMenu onAdd={handleAdd} disabled={isPending} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {blocks.map((block, index) => (
              <SortableBlockItem
                key={block.id}
                block={editingId === block.id && pendingContent[block.id]
                  ? { ...block, content: pendingContent[block.id] }
                  : block
                }
                isEditing={editingId === block.id}
                onToggleEdit={() => {
                  if (editingId === block.id) {
                    handleSave(block.id);
                  } else {
                    setEditingId(block.id);
                    setPendingContent((prev) => ({ ...prev, [block.id]: block.content }));
                  }
                }}
                onDelete={() => handleDelete(block.id)}
                onContentChange={(content) =>
                  setPendingContent((prev) => ({ ...prev, [block.id]: content }))
                }
                onMoveUp={() => moveBlock(index, "up")}
                onMoveDown={() => moveBlock(index, "down")}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
          Sin secciones. Haz clic en "Agregar sección" para comenzar.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/landing-builder/
git commit -m "feat: add LandingBlockList drag-and-drop admin component"
```

---

## Task 7: Integrate LandingBlockList into product forms

**Files:**
- Modify: `components/admin/EditProductForm.tsx`
- Modify: `components/admin/NewProductForm.tsx`

- [ ] **Step 1: Add import and dynamic fetch in EditProductForm**

In `components/admin/EditProductForm.tsx`, add the import at the top of the file:

```typescript
import LandingBlockList from "@/components/admin/landing-builder/LandingBlockList";
```

Find the Presentación card (around line 660). It currently ends with a template preview `<div>`. After that div, inside the `<CardContent>`, add this block:

```tsx
{formData.template === "LANDING" && (
  <div className="mt-4 pt-4 border-t">
    <LandingBlockList
      productId={product.id}
      initialBlocks={(product as any).landingBlocks ?? []}
    />
  </div>
)}
```

- [ ] **Step 2: Update the product query in EditProductForm's parent page**

In `app/admin/productos/[productId]/editar/page.tsx` (or wherever the product is fetched for EditProductForm), update the Prisma query to include `landingBlocks`:

```typescript
const product = await prisma.product.findUnique({
  where: { id: productId },
  include: {
    // ... existing includes ...
    landingBlocks: {
      orderBy: { position: "asc" },
    },
  },
});
```

- [ ] **Step 3: NewProductForm — show placeholder**

In `components/admin/NewProductForm.tsx`, inside the Presentación card (around line 655), after the template preview `<div>`, add:

```tsx
{formData.template === "LANDING" && (
  <div className="mt-4 pt-4 border-t rounded-lg bg-muted/30 p-3 text-center text-sm text-muted-foreground">
    💡 Guarda el producto primero para poder agregar secciones de landing.
  </div>
)}
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/admin/EditProductForm.tsx components/admin/NewProductForm.tsx
git commit -m "feat: integrate LandingBlockList into product edit/create forms"
```

---

## Task 8: Frontend block renderers

**Files:**
- Create: `components/shop/GalleryLightbox.tsx`
- Create: `components/shop/templates/blocks/HeroBlock.tsx`
- Create: `components/shop/templates/blocks/BenefitsBlock.tsx`
- Create: `components/shop/templates/blocks/GalleryBlock.tsx`
- Create: `components/shop/templates/blocks/TestimonialsBlock.tsx`
- Create: `components/shop/templates/blocks/VideoBlock.tsx`
- Create: `components/shop/templates/blocks/ColorsBlock.tsx`
- Create: `components/shop/templates/blocks/TickerBlock.tsx`
- Create: `components/shop/templates/blocks/LandingBlockRenderer.tsx`

- [ ] **Step 1: GalleryLightbox (portal)**

```typescript
// components/shop/GalleryLightbox.tsx
"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

interface GalleryLightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function GalleryLightbox({ images, initialIndex, onClose }: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  const prev = useCallback(() => { setIndex((i) => (i - 1 + images.length) % images.length); setScale(1); }, [images.length]);
  const next = useCallback(() => { setIndex((i) => (i + 1) % images.length); setScale(1); }, [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between p-3">
        <span className="text-white/70 text-sm">{index + 1} / {images.length}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div style={{ transform: `scale(${scale})`, transition: "transform 0.2s" }} className="relative max-w-full max-h-full">
          <Image src={images[index]} alt="" width={1200} height={900} className="max-h-[70vh] w-auto object-contain" />
        </div>
        <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2">
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2">
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button onClick={() => setScale((s) => Math.min(s + 0.5, 3))} className="bg-white/10 hover:bg-white/20 rounded p-1.5">
            <ZoomIn className="h-4 w-4 text-white" />
          </button>
          <button onClick={() => setScale((s) => Math.max(s - 0.5, 1))} className="bg-white/10 hover:bg-white/20 rounded p-1.5">
            <ZoomOut className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-2 p-3 overflow-x-auto">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setIndex(i); setScale(1); }}
            className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${i === index ? "border-white" : "border-transparent opacity-60"}`}
          >
            <Image src={img} alt="" width={48} height={48} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: HeroBlock**

```typescript
// components/shop/templates/blocks/HeroBlock.tsx
"use client";

import Image from "next/image";
import type { HeroBlockContent } from "@/lib/types/landing-blocks";

interface HeroBlockProps {
  content: HeroBlockContent;
  onCta?: () => void;
}

export default function HeroBlock({ content, onCta }: HeroBlockProps) {
  return (
    <section className="relative min-h-[400px] flex items-center justify-center overflow-hidden">
      {content.bgImage && (
        <Image src={content.bgImage} alt="" fill className="object-cover" priority />
      )}
      <div
        className="absolute inset-0"
        style={{ background: content.overlayColor ?? "rgba(0,0,0,0.4)" }}
      />
      <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
        {content.title && <h1 className="text-3xl sm:text-5xl font-bold mb-4">{content.title}</h1>}
        {content.subtitle && <p className="text-lg sm:text-xl mb-8 text-white/90">{content.subtitle}</p>}
        {content.ctaText && onCta && (
          <button
            onClick={onCta}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            {content.ctaText}
          </button>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: BenefitsBlock**

```typescript
// components/shop/templates/blocks/BenefitsBlock.tsx
import type { BenefitsBlockContent } from "@/lib/types/landing-blocks";

export default function BenefitsBlock({ content }: { content: BenefitsBlockContent }) {
  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {content.cards.map((card, i) => (
          <div key={i} className="flex gap-4 p-5 rounded-xl border bg-card">
            <span className="text-3xl flex-shrink-0">{card.icon}</span>
            <div>
              <h3 className="font-semibold mb-1">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: GalleryBlock (slider + stacked + lightbox)**

```typescript
// components/shop/templates/blocks/GalleryBlock.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import GalleryLightbox from "@/components/shop/GalleryLightbox";
import type { GalleryBlockContent } from "@/lib/types/landing-blocks";

interface GalleryBlockProps {
  content: GalleryBlockContent;
  onBuyNow?: () => void;
}

function SliderGallery({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  const [current, setCurrent] = useState(0);
  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrent((i) => (i + 1) % images.length);

  return (
    <div>
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in" onClick={() => onOpen(current)}>
        <Image src={images[current]} alt="" fill className="object-cover" />
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <div className="absolute bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">🔍</div>
      </div>
      <div className="flex justify-center gap-2 mt-3">
        {images.map((img, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${i === current ? "border-primary" : "border-transparent opacity-60"}`}>
            <Image src={img} alt="" width={56} height={56} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GalleryBlock({ content, onBuyNow }: GalleryBlockProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (content.images.length === 0) return null;

  return (
    <section className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {content.displayType === "slider" ? (
          <SliderGallery images={content.images} onOpen={setLightboxIndex} />
        ) : (
          <div className="space-y-6">
            {content.images.map((img, i) => (
              <div key={i} className="rounded-xl overflow-hidden border">
                <Image src={img} alt="" width={800} height={600} className="w-full object-cover cursor-zoom-in" onClick={() => setLightboxIndex(i)} />
                {content.showBuyButton && onBuyNow && (
                  <div className="p-3">
                    <button onClick={onBuyNow} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors">
                      🛒 Comprar ahora
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {lightboxIndex !== null && (
          <GalleryLightbox
            images={content.images}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: TestimonialsBlock**

```typescript
// components/shop/templates/blocks/TestimonialsBlock.tsx
import type { TestimonialsBlockContent } from "@/lib/types/landing-blocks";
import { Star } from "lucide-react";

export default function TestimonialsBlock({ content }: { content: TestimonialsBlockContent }) {
  return (
    <section className="py-12 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Lo que dicen nuestros clientes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.items.map((item, i) => (
            <div key={i} className="bg-card rounded-xl p-5 border shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                {item.photo ? (
                  <img src={item.photo} alt={item.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {item.name[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{item.name}</p>
                  <div className="flex">
                    {Array.from({ length: item.rating }).map((_, j) => (
                      <Star key={j} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: VideoBlock (custom player)**

```typescript
// components/shop/templates/blocks/VideoBlock.tsx
"use client";

import { useState, useRef } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { VideoBlockContent, VideoItem } from "@/lib/types/landing-blocks";

function getEmbedUrl(video: VideoItem): string {
  if (video.provider === "youtube") {
    const id = video.url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&mute=1&playsinline=1` : "";
  }
  if (video.provider === "vimeo") {
    const id = video.url.match(/vimeo\.com\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1&controls=0&muted=1` : "";
  }
  return video.url;
}

function VideoPlayer({ video, onBuyNow }: { video: VideoItem; onBuyNow?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleClick = () => {
    if (video.provider === "upload" && videoRef.current) {
      if (playing) videoRef.current.pause(); else videoRef.current.play();
      setPlaying(!playing);
    } else {
      setPlaying(true);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border bg-black">
      <div className="relative aspect-video cursor-pointer" onClick={handleClick}>
        {video.provider === "upload" ? (
          <video
            ref={videoRef}
            src={video.url}
            muted={muted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : playing ? (
          <iframe
            src={getEmbedUrl(video)}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full bg-black/80 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="h-8 w-8 text-white fill-white" />
            </div>
          </div>
        )}
        {video.provider === "upload" && (
          <button
            onClick={(e) => { e.stopPropagation(); setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
      </div>
      {video.title && <p className="text-sm font-medium px-3 py-2 text-center">{video.title}</p>}
      {onBuyNow && (
        <div className="px-3 pb-3">
          <button onClick={onBuyNow} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
            🛒 Comprar ahora
          </button>
        </div>
      )}
    </div>
  );
}

interface VideoBlockProps {
  content: VideoBlockContent;
  onBuyNow?: () => void;
}

export default function VideoBlock({ content, onBuyNow }: VideoBlockProps) {
  const [slideStart, setSlideStart] = useState(0);
  const perSlide = 3;

  if (content.videos.length === 0) return null;

  const visibleVideos = content.videos.slice(slideStart, slideStart + perSlide);
  const hasPrev = slideStart > 0;
  const hasNext = slideStart + perSlide < content.videos.length;

  return (
    <section className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {content.displayType === "slider" ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {visibleVideos.map((video, i) => (
                <VideoPlayer key={slideStart + i} video={video} />
              ))}
            </div>
            {(hasPrev || hasNext) && (
              <div className="flex justify-center gap-3 mt-4">
                <button disabled={!hasPrev} onClick={() => setSlideStart((s) => s - perSlide)} className="disabled:opacity-30 bg-card border rounded-full p-2 hover:bg-muted transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button disabled={!hasNext} onClick={() => setSlideStart((s) => s + perSlide)} className="disabled:opacity-30 bg-card border rounded-full p-2 hover:bg-muted transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
            {content.showBuyButton && onBuyNow && (
              <div className="mt-4 text-center">
                <button onClick={onBuyNow} className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition-colors">
                  🛒 Comprar ahora
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {content.videos.map((video, i) => (
              <VideoPlayer key={i} video={video} onBuyNow={content.showBuyButton ? onBuyNow : undefined} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 7: ColorsBlock (injects CSS vars)**

```typescript
// components/shop/templates/blocks/ColorsBlock.tsx
"use client";

import { useEffect } from "react";
import type { ColorsBlockContent } from "@/lib/types/landing-blocks";

export default function ColorsBlock({ content }: { content: ColorsBlockContent }) {
  useEffect(() => {
    const root = document.querySelector(".landing-product") as HTMLElement | null;
    if (!root) return;
    if (content.primary) root.style.setProperty("--color-primary", content.primary);
    if (content.background) root.style.setProperty("--color-background", content.background);
    if (content.cta) root.style.setProperty("--color-cta", content.cta);
    if (content.text) root.style.setProperty("--color-text", content.text);
  }, [content]);

  return null;
}
```

- [ ] **Step 8: TickerBlock**

```typescript
// components/shop/templates/blocks/TickerBlock.tsx
"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds, parseISO } from "date-fns";
import type { TickerBlockContent } from "@/lib/types/landing-blocks";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

interface TickerBlockProps {
  content: TickerBlockContent;
}

export default function TickerBlock({ content }: TickerBlockProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!content.endsAt || (content.mode !== "countdown" && content.mode !== "both")) return;
    const update = () => {
      const diff = differenceInSeconds(parseISO(content.endsAt!), new Date());
      setSecondsLeft(Math.max(0, diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [content.endsAt, content.mode]);

  const style: React.CSSProperties = {
    backgroundColor: content.bgColor ?? "#dc2626",
    color: content.textColor ?? "#ffffff",
    ...(content.sticky ? { position: "sticky", top: 0, zIndex: 40 } : {}),
  };

  const showScrolling = content.mode === "scrolling" || content.mode === "both";
  const showCountdown = content.mode === "countdown" || content.mode === "both";

  return (
    <div style={style} className="py-2 px-4 flex items-center justify-center gap-4 text-sm font-medium overflow-hidden">
      {showScrolling && content.scrollingText && (
        <div className="overflow-hidden flex-1">
          <div
            className="whitespace-nowrap animate-marquee"
            style={{ animationDuration: `${Math.max(5, 300 / (content.speed ?? 30))}s` }}
          >
            {content.scrollingText} &nbsp;&nbsp;&nbsp; {content.scrollingText}
          </div>
        </div>
      )}
      {showCountdown && secondsLeft !== null && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {content.countdownLabel && <span className="opacity-90">{content.countdownLabel}</span>}
          <span className="font-bold text-base tabular-nums">{formatTime(secondsLeft)}</span>
        </div>
      )}
    </div>
  );
}
```

Add the `animate-marquee` keyframe to `app/globals.css`:

```css
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee linear infinite;
}
```

- [ ] **Step 9: LandingBlockRenderer**

```typescript
// components/shop/templates/blocks/LandingBlockRenderer.tsx
"use client";

import HeroBlock from "./HeroBlock";
import BenefitsBlock from "./BenefitsBlock";
import GalleryBlock from "./GalleryBlock";
import TestimonialsBlock from "./TestimonialsBlock";
import VideoBlock from "./VideoBlock";
import ColorsBlock from "./ColorsBlock";
import TickerBlock from "./TickerBlock";
import type { LandingBlock, LandingBlockType, BlockContent } from "@/lib/types/landing-blocks";

interface LandingBlockRendererProps {
  blocks: LandingBlock[];
  onBuyNow?: () => void;
}

export default function LandingBlockRenderer({ blocks, onBuyNow }: LandingBlockRendererProps) {
  const stickyBlocks = blocks.filter((b) => b.type === "TICKER" && (b.content as any).sticky);
  const flowBlocks = blocks.filter((b) => !(b.type === "TICKER" && (b.content as any).sticky));

  const renderBlock = (block: LandingBlock) => {
    const content = block.content as any;
    switch (block.type as LandingBlockType) {
      case "HERO": return <HeroBlock key={block.id} content={content} onCta={onBuyNow} />;
      case "BENEFITS": return <BenefitsBlock key={block.id} content={content} />;
      case "GALLERY": return <GalleryBlock key={block.id} content={content} onBuyNow={onBuyNow} />;
      case "TESTIMONIALS": return <TestimonialsBlock key={block.id} content={content} />;
      case "VIDEO": return <VideoBlock key={block.id} content={content} onBuyNow={onBuyNow} />;
      case "COLORS": return <ColorsBlock key={block.id} content={content} />;
      case "TICKER": return <TickerBlock key={block.id} content={content} />;
      default: return null;
    }
  };

  return (
    <>
      {stickyBlocks.map(renderBlock)}
      {flowBlocks.map(renderBlock)}
    </>
  );
}
```

- [ ] **Step 10: Commit all block renderers**

```bash
git add components/shop/ 
git commit -m "feat: add all landing block renderer components"
```

---

## Task 9: Wire up the product page

**Files:**
- Modify: `app/(shop)/productos/[slug]/page.tsx`
- Modify: `components/shop/templates/ProductLandingView.tsx`

- [ ] **Step 1: Fetch landingBlocks in product page**

In `app/(shop)/productos/[slug]/page.tsx`, update the Prisma query (around line 18) to include blocks:

```typescript
const product = await prisma.product.findUnique({
  where: { slug, active: true },
  include: {
    categories: { include: { category: true } },
    variants: { where: { active: true }, orderBy: { price: "asc" } },
    options: { include: { values: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } },
    landingBlocks: { orderBy: { position: "asc" } },
  },
});
```

Pass blocks in `templateProps` (around line 110):

```typescript
const templateProps = {
  product,
  serializedProduct,
  serializedVariants,
  options: product.options,
  initialPrice,
  initialComparePrice,
  inStock,
  totalStock,
  landingBlocks: (product as any).landingBlocks ?? [],
};
```

- [ ] **Step 2: Update ProductLandingView to use LandingBlockRenderer**

Replace the contents of `components/shop/templates/ProductLandingView.tsx` with:

```typescript
"use client";

import ProductActions from "@/components/shop/ProductActions";
import ProductPrice from "@/components/shop/ProductPrice";
import LandingBlockRenderer from "@/components/shop/templates/blocks/LandingBlockRenderer";
import type { LandingBlock } from "@/lib/types/landing-blocks";

interface ProductLandingViewProps {
  product: any;
  serializedProduct: any;
  serializedVariants: any[];
  options: any[];
  initialPrice: number;
  initialComparePrice: number | null;
  inStock: boolean;
  totalStock: number;
  landingBlocks: LandingBlock[];
}

export default function ProductLandingView({
  product,
  serializedProduct,
  serializedVariants,
  options,
  initialPrice,
  initialComparePrice,
  inStock,
  totalStock,
  landingBlocks,
}: ProductLandingViewProps) {
  return (
    <div className="landing-product">
      {/* Landing blocks (hero, ticker, benefits, etc.) */}
      <LandingBlockRenderer blocks={landingBlocks} />

      {/* Product actions section (always present at bottom) */}
      <section className="py-10 px-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
        <ProductPrice
          initialPrice={initialPrice}
          initialComparePrice={initialComparePrice}
          serializedVariants={serializedVariants}
        />
        <div className="mt-4">
          <ProductActions
            product={serializedProduct}
            variants={serializedVariants}
            options={options}
            inStock={inStock}
            totalStock={totalStock}
          />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Build and smoke test**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Then start dev server and open a product with `template = LANDING` to verify blocks render:

```bash
npm run dev
```

Visit `http://localhost:3000/productos/<any-landing-product-slug>`. Verify page renders without errors.

- [ ] **Step 4: Manual admin test**

1. Open `http://localhost:3000/admin/productos/<id>/editar`
2. Set "Tipo de Página" to "Landing Page"
3. Verify the block list section appears
4. Add a HERO block, fill in title, save
5. Add a TICKER block with countdown mode, save
6. Reorder blocks by dragging
7. Visit the product page — verify the hero and ticker render correctly

- [ ] **Step 5: Commit**

```bash
git add app/(shop)/productos/ components/shop/templates/ProductLandingView.tsx
git commit -m "feat: wire up landing blocks to product detail page"
```

---

## Task 10: Add landingBlocks query to edit product admin page

**Files:**
- Modify: `app/admin/productos/[productId]/editar/page.tsx` (or equivalent)

- [ ] **Step 1: Find the admin edit page**

```bash
find "d:/PROYECTOS/Sistema ecommerce/shopgood-pe/app/admin" -name "page.tsx" | grep -i producto
```

- [ ] **Step 2: Add landingBlocks to the include**

Find the `prisma.product.findUnique` call in that file and add `landingBlocks` to the include:

```typescript
landingBlocks: {
  orderBy: { position: "asc" },
},
```

- [ ] **Step 3: Final build check**

```bash
npm run build
```

Expected: build passes with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/admin/
git commit -m "feat: include landingBlocks in admin product edit query"
```
