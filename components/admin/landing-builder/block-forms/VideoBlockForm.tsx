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
      <div className="flex gap-4 items-center flex-wrap">
        <Label>Tipo de display</Label>
        <div className="flex gap-2">
          {(["slider", "stacked"] as const).map((type) => (
            <button
              key={type}
              type="button"
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
        <Label>Mostrar botón &quot;Comprar ahora&quot;</Label>
      </div>

      <div className="space-y-3">
        {content.videos.map((video, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground">Video {i + 1}</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeVideo(i)}>
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
              <Input
                value={video.url}
                onChange={(e) => updateVideo(i, "url", e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Título (opcional)</Label>
              <Input value={video.title ?? ""} onChange={(e) => updateVideo(i, "title", e.target.value)} className="text-xs" />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addVideo} className="w-full">
          <Plus className="h-3 w-3 mr-1" /> Agregar video
        </Button>
      </div>
    </div>
  );
}
