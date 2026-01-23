import Image from "next/image";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstagramPost {
  id: string;
  image: string;
  url?: string;
  likes?: number;
}

interface InstagramGalleryProps {
  title: string;
  subtitle?: string;
  posts: InstagramPost[];
  instagramHandle?: string;
  instagramUrl?: string;
  layout?: "grid" | "masonry";
  className?: string;
}

export function InstagramGallery({
  title,
  subtitle,
  posts,
  instagramHandle = "@tuwallart",
  instagramUrl = "https://instagram.com/tuwallart",
  layout = "grid",
  className = "",
}: InstagramGalleryProps) {
  if (layout === "masonry") {
    return (
      <section className={`py-16 md:py-24 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg">
              <Instagram className="h-8 w-8" />
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mx-auto mb-6 max-w-2xl text-lg text-muted-foreground">
                {subtitle}
              </p>
            )}
            <Button asChild variant="outline" size="lg">
              <Link
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Instagram className="mr-2 h-4 w-4" />
                Síguenos en {instagramHandle}
              </Link>
            </Button>
          </div>

          {/* Masonry Gallery */}
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
            {posts.map((post, index) => (
              <Link
                key={post.id}
                href={post.url || instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative mb-4 block overflow-hidden rounded-lg break-inside-avoid"
              >
                <div className={`relative ${index % 3 === 0 ? 'aspect-[3/4]' : index % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'}`}>
                  <Image
                    src={post.image}
                    alt="Instagram post"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-5 w-5" />
                        <span className="text-sm font-medium">Ver en Instagram</span>
                      </div>
                      {post.likes && (
                        <div className="flex items-center gap-1">
                          <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                          </svg>
                          <span className="text-sm">{post.likes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Grid layout
  return (
    <section className={`bg-muted/20 py-16 md:py-24 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg">
            <Instagram className="h-8 w-8" />
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mb-6 max-w-2xl text-lg text-muted-foreground">
              {subtitle}
            </p>
          )}
          <Button asChild variant="outline" size="lg">
            <Link
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Instagram className="mr-2 h-4 w-4" />
              Síguenos en {instagramHandle}
            </Link>
          </Button>
        </div>

        {/* Grid Gallery */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={post.url || instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg"
            >
              <Image
                src={post.image}
                alt="Instagram post"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Instagram className="mx-auto mb-2 h-8 w-8" />
                    <p className="text-sm font-medium">Ver en Instagram</p>
                    {post.likes && (
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                        </svg>
                        <span className="text-sm">{post.likes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}