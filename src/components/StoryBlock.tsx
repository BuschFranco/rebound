import { STORY } from "@/data/business";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { LogoMark } from "./Logo";
import { WhatsAppIcon } from "./icons";

/** "Detrás de la marca": una voz humana cerca del momento de compra genera confianza. */
export function StoryBlock({ className = "" }: { className?: string }) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-line bg-surface p-6 sm:p-10 ${className}`}
    >
      <div className="bg-glow absolute inset-0 opacity-70" aria-hidden />
      <div className="relative grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <LogoMark className="size-16 sm:size-20" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Detrás de la marca</p>
          <h2 className="mt-2 font-display text-3xl uppercase italic leading-none sm:text-4xl">
            {STORY.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{STORY.text}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <a
              href={buildWhatsAppUrl("¡Hola! Tengo una consulta.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-black transition hover:brightness-110"
            >
              <WhatsAppIcon className="size-4" />
              Escribinos
            </a>
            <span className="text-sm italic text-muted">— {STORY.signature}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
