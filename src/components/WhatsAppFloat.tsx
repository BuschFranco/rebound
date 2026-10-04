import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./icons";

export function WhatsAppFloat() {
  return (
    <a
      href={buildWhatsAppUrl("¡Hola! Tengo una consulta sobre un producto.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultanos por WhatsApp"
      className="fixed bottom-5 right-5 z-20 grid size-14 place-items-center rounded-full bg-whatsapp text-black shadow-[0_0_30px_-6px_var(--whatsapp)] transition hover:scale-105"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
