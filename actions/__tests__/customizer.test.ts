import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    customizableTemplate: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(async () => ({ user: { id: "u1" }, response: null })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  saveCustomizableTemplate,
  listCustomizableTemplates,
  deleteCustomizableTemplate,
} from "../customizer";
import { prisma } from "@/lib/db";

const validInput = {
  name: "Polo blanco",
  description: null,
  active: true,
  surcharge: 5,
  zones: [
    {
      id: "frontal", name: "Frontal",
      mockupImage: "https://x.public.blob.vercel-storage.com/m.png",
      bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
      printResolutionDPI: 300,
    },
  ],
  allowedFonts: ["Inter"],
  allowedColors: ["#000000"],
  allowCustomColors: true,
  sizeGuide: null,
  maxLayersPerZone: 8,
  maxCharsPerLayer: 40,
};

describe("saveCustomizableTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a template with valid data", async () => {
    (prisma.customizableTemplate.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1" });
    const result = await saveCustomizableTemplate(validInput);
    expect(result.success).toBe(true);
    expect(prisma.customizableTemplate.create).toHaveBeenCalled();
  });

  it("rejects empty name", async () => {
    const result = await saveCustomizableTemplate({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects zone with widthPct=0", async () => {
    const result = await saveCustomizableTemplate({
      ...validInput,
      zones: [{
        ...validInput.zones[0],
        bounds: { xPct: 0, yPct: 0, widthPct: 0, heightPct: 50 },
      }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects mockupImage URL outside Vercel Blob domain", async () => {
    const result = await saveCustomizableTemplate({
      ...validInput,
      zones: [{ ...validInput.zones[0], mockupImage: "https://evil.com/m.png" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex color", async () => {
    const result = await saveCustomizableTemplate({
      ...validInput,
      allowedColors: ["not-a-hex"],
    });
    expect(result.success).toBe(false);
  });
});

describe("listCustomizableTemplates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns mapped templates", async () => {
    (prisma.customizableTemplate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "t1", name: "Polo", description: null, active: true,
        surcharge: 5, zones: [], allowedFonts: ["Inter"], allowedColors: ["#000"],
        allowCustomColors: true, sizeGuide: null, maxLayersPerZone: 8, maxCharsPerLayer: 40,
      },
    ]);
    const result = await listCustomizableTemplates();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
    expect(typeof result[0].surcharge === "number" || result[0].surcharge === null).toBe(true);
  });
});

describe("deleteCustomizableTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks delete if products use the template", async () => {
    (prisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    const result = await deleteCustomizableTemplate("t1");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/3 producto/);
  });

  it("deletes when no products use it", async () => {
    (prisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.customizableTemplate.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const result = await deleteCustomizableTemplate("t1");
    expect(result.success).toBe(true);
  });
});
