import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
        )}
        <h2 className="font-display text-4xl uppercase italic leading-none sm:text-5xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-xs font-bold uppercase tracking-widest text-muted transition hover:text-accent"
        >
          {linkLabel ?? "Ver todo"} →
        </Link>
      )}
    </div>
  );
}
