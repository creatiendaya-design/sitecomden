import { LucideIcon } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeatureSectionProps {
  title?: string;
  subtitle?: string;
  features: Feature[];
  layout?: "grid" | "horizontal" | "cards";
  columns?: 2 | 3 | 4;
  className?: string;
}

export function FeatureSection({
  title,
  subtitle,
  features,
  layout = "grid",
  columns = 3,
  className = "",
}: FeatureSectionProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  if (layout === "horizontal") {
    return (
      <section className={`border-y bg-muted/30 py-12 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "cards") {
    return (
      <section className={`py-16 md:py-24 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          {title && (
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h2>
              {subtitle && (
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Cards Grid */}
          <div className={`grid gap-6 ${gridCols[columns]}`}>
            {features.map((feature, index) => (
              <div
                key={index}
                className="group rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Grid básico
  return (
    <section className={`py-16 md:py-24 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {title && (
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Simple Grid */}
        <div className={`grid gap-8 ${gridCols[columns]}`}>
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}