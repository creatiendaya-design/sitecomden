// app/(shop)/productos/[slug]/personalizar/layout.tsx
export default function PersonalizarLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
