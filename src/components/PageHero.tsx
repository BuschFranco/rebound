import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  children,
  variant = "glow",
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  variant?: "glow" | "gradient";
}) {
  return (
    <section
      className={`relative overflow-hidden border-b border-line ${
        variant === "gradient" ? "bg-gradient-brand" : "bg-glow"
      }`}
    >
      <div className="bg-court absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        {eyebrow && (
          <p
            className={`text-xs font-bold uppercase tracking-[0.35em] ${
              variant === "gradient" ? "text-white/80" : "text-accent"
            }`}
          >
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 break-words font-display text-6xl uppercase italic leading-[0.9] sm:text-8xl">
          {title}
        </h1>
        {children && <div className="mt-4 text-sm text-white/80 sm:text-base">{children}</div>}
      </div>
    </section>
  );
}
