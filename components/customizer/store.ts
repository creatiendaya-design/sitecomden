// components/customizer/store.ts
import { create } from "zustand";
import type {
  CustomizableTemplateData,
  TextLayer,
  CustomDesignZone,
  CustomDesignSnapshot,
} from "@/lib/customizer/types";

interface BuilderState {
  template: CustomizableTemplateData | null;
  variantId: string | null;
  cartItemId: string | null;
  activeZoneId: string | null;
  selectedLayerId: string | null;
  zones: Record<string, TextLayer[]>;
  history: { zones: Record<string, TextLayer[]> }[];
  historyIndex: number;
  dirty: boolean;
  uploading: boolean;

  load: (
    template: CustomizableTemplateData,
    variantId: string | null,
    initial?: { zones: CustomDesignZone[]; cartItemId?: string }
  ) => void;
  reset: () => void;
  setActiveZone: (zoneId: string) => void;
  setSelectedLayer: (layerId: string | null) => void;
  addLayer: (layer: TextLayer) => void;
  updateLayer: (layerId: string, patch: Partial<TextLayer>) => void;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  setVariantId: (id: string | null) => void;
  setUploading: (v: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getLayersForActiveZone: () => TextLayer[];
  getSelectedLayer: () => TextLayer | null;
  hasContent: () => boolean;
  buildSnapshot: () => CustomDesignSnapshot | null;
  buildDesignZones: () => CustomDesignZone[];
}

const HISTORY_LIMIT = 50;

export const useBuilderStore = create<BuilderState>((set, get) => ({
  template: null,
  variantId: null,
  cartItemId: null,
  activeZoneId: null,
  selectedLayerId: null,
  zones: {},
  history: [],
  historyIndex: -1,
  dirty: false,
  uploading: false,

  load: (template, variantId, initial) => {
    const zones: Record<string, TextLayer[]> = {};
    for (const z of template.zones) zones[z.id] = [];
    if (initial) {
      for (const z of initial.zones) zones[z.zoneId] = z.layers;
    }
    set({
      template,
      variantId,
      cartItemId: initial?.cartItemId ?? null,
      activeZoneId: template.zones[0]?.id ?? null,
      selectedLayerId: null,
      zones,
      history: [{ zones }],
      historyIndex: 0,
      dirty: false,
    });
  },

  reset: () =>
    set({
      template: null,
      variantId: null,
      cartItemId: null,
      activeZoneId: null,
      selectedLayerId: null,
      zones: {},
      history: [],
      historyIndex: -1,
      dirty: false,
      uploading: false,
    }),

  setActiveZone: (zoneId) =>
    set({ activeZoneId: zoneId, selectedLayerId: null }),

  setSelectedLayer: (layerId) => set({ selectedLayerId: layerId }),

  addLayer: (layer) => {
    const { activeZoneId, zones } = get();
    if (!activeZoneId) return;
    const newZones = {
      ...zones,
      [activeZoneId]: [...(zones[activeZoneId] ?? []), layer],
    };
    pushHistory(set, get, newZones);
    set({ zones: newZones, selectedLayerId: layer.id, dirty: true });
  },

  updateLayer: (layerId, patch) => {
    const { activeZoneId, zones } = get();
    if (!activeZoneId) return;
    const newZones = {
      ...zones,
      [activeZoneId]: (zones[activeZoneId] ?? []).map((l) =>
        l.id === layerId ? { ...l, ...patch } : l
      ),
    };
    pushHistory(set, get, newZones);
    set({ zones: newZones, dirty: true });
  },

  deleteLayer: (layerId) => {
    const { activeZoneId, zones } = get();
    if (!activeZoneId) return;
    const newZones = {
      ...zones,
      [activeZoneId]: (zones[activeZoneId] ?? []).filter(
        (l) => l.id !== layerId
      ),
    };
    pushHistory(set, get, newZones);
    set({ zones: newZones, selectedLayerId: null, dirty: true });
  },

  duplicateLayer: (layerId) => {
    const { activeZoneId, zones } = get();
    if (!activeZoneId) return;
    const layers = zones[activeZoneId] ?? [];
    const orig = layers.find((l) => l.id === layerId);
    if (!orig) return;
    const dup: TextLayer = {
      ...orig,
      id: crypto.randomUUID(),
      x: orig.x + 5,
      y: orig.y + 5,
    };
    const newZones = { ...zones, [activeZoneId]: [...layers, dup] };
    pushHistory(set, get, newZones);
    set({ zones: newZones, selectedLayerId: dup.id, dirty: true });
  },

  setVariantId: (id) => set({ variantId: id, dirty: true }),
  setUploading: (v) => set({ uploading: v }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      zones: prev.zones,
      historyIndex: historyIndex - 1,
      selectedLayerId: null,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      zones: next.zones,
      historyIndex: historyIndex + 1,
      selectedLayerId: null,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => {
    const { historyIndex, history } = get();
    return historyIndex < history.length - 1;
  },

  getLayersForActiveZone: () => {
    const { activeZoneId, zones } = get();
    return activeZoneId ? (zones[activeZoneId] ?? []) : [];
  },

  getSelectedLayer: () => {
    const { selectedLayerId } = get();
    if (!selectedLayerId) return null;
    return (
      get()
        .getLayersForActiveZone()
        .find((l) => l.id === selectedLayerId) ?? null
    );
  },

  hasContent: () =>
    Object.values(get().zones).some((arr) => arr.length > 0),

  buildSnapshot: () => {
    const t = get().template;
    if (!t) return null;
    return {
      allowedFonts: t.allowedFonts,
      allowedColors: t.allowedColors,
      allowCustomColors: t.allowCustomColors,
      maxLayersPerZone: t.maxLayersPerZone,
      maxCharsPerLayer: t.maxCharsPerLayer,
      surcharge: t.surcharge,
      zones: t.zones.map((z) => ({
        id: z.id,
        name: z.name,
        bounds: z.bounds,
      })),
    };
  },

  buildDesignZones: () => {
    const { zones } = get();
    return Object.entries(zones)
      .filter(([, layers]) => layers.length > 0)
      .map(([zoneId, layers]) => ({ zoneId, layers }));
  },
}));

function pushHistory(
  set: (s: Partial<BuilderState>) => void,
  get: () => BuilderState,
  newZones: Record<string, TextLayer[]>
) {
  const { history, historyIndex } = get();
  const trimmed = history.slice(0, historyIndex + 1);
  const next = [...trimmed, { zones: newZones }];
  if (next.length > HISTORY_LIMIT) next.shift();
  set({ history: next, historyIndex: next.length - 1 });
}
