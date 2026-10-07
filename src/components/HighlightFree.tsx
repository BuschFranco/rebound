import { Fragment } from "react";

/** Resalta en naranja "gratis" (y "gratuito/a") dentro de un texto de promo. */
export function HighlightFree({ text }: { text: string }) {
  return (
    <>
      {text.split(/(gratis|gratuit[oa]s?)/i).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold text-accent">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
