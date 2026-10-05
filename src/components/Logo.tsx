import Image from "next/image";
import icon from "@/app/icon.png";
import logo from "@/app/logo.png";

/** Isotipo de la marca (la pelota rebotando en la cancha), en blanco para fondos oscuros. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return <Image src={icon} alt="" sizes="80px" className={`object-contain invert ${className}`} />;
}

export function Logo({ className = "h-11 sm:h-12" }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt="REBOUND"
      priority
      sizes="160px"
      className={`w-auto ${className}`}
    />
  );
}
