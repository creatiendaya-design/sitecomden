"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from "lucide-react";
import type { VideoBlockContent, VideoItem } from "@/lib/types/landing-blocks";

interface VideoBlockProps {
  content: VideoBlockContent;
  onBuyClick?: () => void;
}

export default function VideoBlock({ content, onBuyClick }: VideoBlockProps) {
  const { displayType, videos, showBuyButton } = content;
  if (!videos?.length) return null;

  if (displayType === "stacked") {
    return <VideoStacked videos={videos} showBuyButton={showBuyButton} onBuyClick={onBuyClick} />;
  }
  return <VideoSlider videos={videos} showBuyButton={showBuyButton} onBuyClick={onBuyClick} />;
}

const VIDEOS_PER_SLIDE = 3;

function VideoSlider({
  videos,
  showBuyButton,
  onBuyClick,
}: {
  videos: VideoItem[];
  showBuyButton: boolean;
  onBuyClick?: () => void;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(videos.length / VIDEOS_PER_SLIDE);
  const visible = videos.slice(page * VIDEOS_PER_SLIDE, page * VIDEOS_PER_SLIDE + VIDEOS_PER_SLIDE);

  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const next = useCallback(() => setPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages]);

  return (
    <section className="landing-section py-12">
      <div className="container mx-auto px-4">
        <div className="relative">
          {/* Arrow nav */}
          {totalPages > 1 && (
            <>
              <button
                onClick={prev}
                disabled={page === 0}
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                disabled={page >= totalPages - 1}
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((video, i) => (
              <VideoCard key={page * VIDEOS_PER_SLIDE + i} video={video} />
            ))}
          </div>
        </div>

        {showBuyButton && (
          <div className="flex justify-center mt-8">
            <button
              onClick={onBuyClick}
              className="landing-cta-btn rounded-full px-8 py-3 font-semibold shadow-md hover:scale-105 transition-transform active:scale-95"
            >
              Comprar ahora
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function VideoStacked({
  videos,
  showBuyButton,
  onBuyClick,
}: {
  videos: VideoItem[];
  showBuyButton: boolean;
  onBuyClick?: () => void;
}) {
  return (
    <section className="landing-section py-12">
      <div className="container mx-auto px-4 space-y-8">
        {videos.map((video, i) => (
          <div key={i} className="space-y-3">
            <VideoCard video={video} />
            {showBuyButton && (
              <button
                onClick={onBuyClick}
                className="landing-cta-btn w-full rounded-full py-3 font-semibold hover:scale-[1.02] transition-transform active:scale-[0.98]"
              >
                Comprar ahora
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function VideoCard({ video }: { video: VideoItem }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleClick = () => {
    if (!playing) {
      videoRef.current?.play();
      setPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  if (video.provider === "youtube" || video.provider === "vimeo") {
    const embedUrl = getEmbedUrl(video.url, video.provider);
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden shadow-md bg-black">
        {video.title && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
            <p className="text-white text-sm font-medium line-clamp-1">{video.title}</p>
          </div>
        )}
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title={video.title ?? "Video"}
        />
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video rounded-2xl overflow-hidden shadow-md bg-black cursor-pointer group"
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        src={video.url}
        muted={muted}
        playsInline
        loop
        controls={false}
        className="w-full h-full object-cover"
        onEnded={() => setPlaying(false)}
      />

      {/* Play overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <Play className="h-7 w-7 text-gray-800 translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Sound toggle */}
      {playing && (
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}

      {video.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
          <p className="text-white text-sm font-medium line-clamp-1">{video.title}</p>
        </div>
      )}
    </div>
  );
}

function getEmbedUrl(url: string, provider: "youtube" | "vimeo"): string {
  if (provider === "youtube") {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  }
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : url;
}
