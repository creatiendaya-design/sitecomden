interface Stat {
  value: string;
  label: string;
  suffix?: string;
  prefix?: string;
}

interface StatsSectionProps {
  title?: string;
  subtitle?: string;
  stats: Stat[];
  layout?: "simple" | "cards" | "highlighted";
  className?: string;
}

export function StatsSection({
  title,
  subtitle,
  stats,
  layout = "simple",
  className = "",
}: StatsSectionProps) {
  if (layout === "highlighted") {
    return (
      <section className={`relative overflow-hidden py-16 md:py-24 ${className}`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
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

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="rounded-2xl border bg-card/50 p-8 text-center shadow-lg backdrop-blur-sm"
              >
                <div className="mb-2 text-4xl font-bold lg:text-5xl">
                  {stat.prefix}
                  {stat.value}
                  {stat.suffix}
                </div>
                <div className="text-sm text-muted-foreground sm:text-base">
                  {stat.label}
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

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group rounded-xl border bg-card p-6 text-center transition-all hover:border-primary hover:shadow-lg"
              >
                <div className="mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-4xl font-bold text-transparent lg:text-5xl">
                  {stat.prefix}
                  {stat.value}
                  {stat.suffix}
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Simple layout
  return (
    <section className={`border-y bg-muted/30 py-12 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {title && (
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">{title}</h2>
            {subtitle && (
              <p className="text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="mb-2 text-4xl font-bold lg:text-5xl">
                {stat.prefix}
                {stat.value}
                {stat.suffix}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}