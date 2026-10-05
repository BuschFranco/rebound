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


class ConfigError(Exception):
    pass


def load_config() -> Config:
    # Prioridad: variables de entorno > admin/.env > .env.local del sitio (solo para lo no secreto).
    site = dotenv_values(ROOT_DIR / ".env.local")
    admin = dotenv_values(ADMIN_DIR / ".env")

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
    return Config(
        supabase_url=supabase_url.rstrip("/"),
        secret_key=secret_key,
        site_url=site_url.rstrip("/"),
        revalidate_secret=revalidate_secret,
    )
