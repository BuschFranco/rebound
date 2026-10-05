import Image from "next/image";
import { useId } from "react";
import logo from "@/app/logo.png";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6a13" />
          <stop offset="0.5" stopColor="#e0336f" />
          <stop offset="1" stopColor="#8b3dff" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#${id})`} />
      <g fill="none" stroke="#0b0a0f" strokeWidth="1.8" strokeLinecap="round">
        <path d="M2.5 16h27" />
        <path d="M16 2v28" />
        <path d="M6.2 6.2a13 13 0 0 1 0 19.6" />
        <path d="M25.8 6.2a13 13 0 0 0 0 19.6" />
      </g>
    </svg>
  );
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
