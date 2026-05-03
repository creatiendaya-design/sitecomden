// lib/size-guides/schema.ts
import { z } from "zod";

export const sizeUnitSchema = z.enum(["cm", "in"]);

export const sizeGuideMarkerSchema = z.object({
  key: z.string().min(1).max(8),
  label: z.string().min(1).max(60),
  description: z.string().min(1).max(2000),
});

export const sizeGuideTabSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  imageUrl: z.string().url().nullable(),
  intro: z.string().max(2000).nullable(),
  markers: z.array(sizeGuideMarkerSchema).max(20),
});

export const sizeGuideColumnSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(40),
});

export const sizeGuideRowSchema = z.object({
  size: z.string().min(1).max(20),
  values: z.record(z.string(), z.number().finite().nonnegative()),
  overrides: z.record(z.string(), z.string()).optional(),
});

export const sizeGuideTableSchema = z.object({
  columns: z.array(sizeGuideColumnSchema).min(1).max(20),
  rows: z.array(sizeGuideRowSchema).min(1).max(50),
});

export const sizeGuideDataSchema = z.object({
  name: z.string().min(1).max(120),
  unit: sizeUnitSchema,
  tabs: z.array(sizeGuideTabSchema).max(8),
  table: sizeGuideTableSchema,
  active: z.boolean(),
});

export type SizeGuideInput = z.infer<typeof sizeGuideDataSchema>;
