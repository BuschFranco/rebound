"""Configuración del panel: lee admin/.env y, como respaldo, el .env.local del sitio."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import dotenv_values

ADMIN_DIR = Path(__file__).resolve().parent
ROOT_DIR = ADMIN_DIR.parent


@dataclass(frozen=True)
class Config:
    supabase_url: str
    secret_key: str
    site_url: str
    revalidate_secret: str
    # Fotos en Cloudflare R2 (si faltan las claves, se usa el Storage de Supabase, p. ej. la base local).
    r2_account_id: str = ""
    r2_bucket: str = ""
    r2_public_url: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""


class ConfigError(Exception):
    pass


def load_config() -> Config:
    # Prioridad: variables de entorno > admin/.env > .env.local del sitio (solo para lo no secreto).
    site = dotenv_values(ROOT_DIR / ".env.local")
    admin = dotenv_values(ADMIN_DIR / ".env")
    # Claves del token de R2 "rebound-catalog" (archivo local, fuera de git).
    r2 = dotenv_values(ROOT_DIR / ".r2-catalog.env")

    def pick(*names: str, sources=(os.environ, admin, site)) -> str:
        for source in sources:
            for name in names:
                value = (source.get(name) or "").strip()
                if value:
                    return value
        return ""

    supabase_url = pick("SUPABASE_URL")
    # La secret key solo se lee del entorno o de admin/.env: nunca debe estar en los archivos del sitio.
    secret_key = pick("SUPABASE_SECRET_KEY", sources=(os.environ, admin))
    site_url = pick("SITE_URL", "NEXT_PUBLIC_SITE_URL")
    revalidate_secret = pick("REVALIDATE_SECRET")

    if not supabase_url:
        raise ConfigError("Falta SUPABASE_URL en admin/.env.")
    if not secret_key:
        raise ConfigError(
            "Falta SUPABASE_SECRET_KEY en admin/.env.\n\n"
            "En local la ves con `npx supabase status` (SECRET_KEY).\n"
            "En la nube: Project Settings → API Keys → Secret keys."
        )
    r2_sources = (os.environ, admin, r2)
    return Config(
        supabase_url=supabase_url.rstrip("/"),
        secret_key=secret_key,
        site_url=site_url.rstrip("/"),
        revalidate_secret=revalidate_secret,
        r2_account_id=pick("R2_ACCOUNT_ID", sources=r2_sources) or "2e3b069064b630882f2cb54755188225",
        r2_bucket=pick("R2_BUCKET", sources=r2_sources) or "rebound-catalog",
        r2_public_url=(pick("R2_PUBLIC_URL", sources=r2_sources) or "https://img.reboundstore.com.ar").rstrip("/"),
        r2_access_key_id=pick("R2_ACCESS_KEY_ID", sources=r2_sources),
        r2_secret_access_key=pick("R2_SECRET_ACCESS_KEY", sources=r2_sources),
    )
