// lib/customizer/canvas-export.ts
import type Konva from "konva";

export interface ZonePngExport {
  zoneId: string;
  blob: Blob;
}

export async function captureZonePng(
  stage: Konva.Stage,
  zoneId: string,
  dpi: number
): Promise<ZonePngExport> {
  const pixelRatio = Math.max(1, Math.min(4, dpi / 96));
  const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return { zoneId, blob };
}

export async function uploadPngBlob(blob: Blob, filename: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, filename);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Error al subir PNG");
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("Respuesta sin URL");
  return json.url;
}

export async function uploadAllZones(
  exports: ZonePngExport[],
  customDesignId: string
): Promise<Array<{ zoneId: string; url: string }>> {
  const results: Array<{ zoneId: string; url: string }> = [];
  for (const exp of exports) {
    const filename = `customizer-${customDesignId}-${exp.zoneId}.png`;
    const url = await uploadPngBlob(exp.blob, filename);
    results.push({ zoneId: exp.zoneId, url });
  }
  return results;
}
