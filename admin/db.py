"""Acceso a Supabase (PostgREST + Storage) con la secret key, más Georef y la revalidación del sitio.

La secret key saltea RLS: este módulo corre solo en la PC del dueño, nunca en el sitio.
"""

from __future__ import annotations

import io
import re
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

import requests
from PIL import Image, ImageOps

from config import Config

BUCKET = "catalog-images"
MAX_IMAGE_SIDE = 1600
GEOREF = "https://apis.datos.gob.ar/georef/api"
# Argentina no tiene horario de verano: UTC-3 fijo.
AR_TZ = timezone(timedelta(hours=-3), "ART")
SLUG_RE = re.compile(r"^[a-z0-9-]+$")


class ApiError(Exception):
    """Error con un mensaje listo para mostrar al usuario."""


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse_ts(value: str | None) -> datetime | None:
    """Timestamp de Postgres/PostgREST → datetime con zona."""
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def friendly_error(payload: dict[str, Any], status: int) -> str:
    code = str(payload.get("code") or "")
    message = str(payload.get("message") or payload.get("error") or "")
    details = str(payload.get("details") or "")
    if code == "23505":
        return "Ya existe un registro con ese identificador (slug o id). Elegí otro."
    if code == "23503":
        return "No se puede: este registro está en uso por otro (por ejemplo, una categoría con productos)."
    if code == "23514":
        rules = {
            "price": "El precio tiene que ser mayor a 0.",
            "compare_at_price": "El precio anterior (oferta) tiene que ser mayor al precio actual.",
            "images": "El producto necesita al menos una imagen.",
            "sizes": "El producto necesita al menos un talle.",
            "colors": "El producto necesita al menos un color.",
            "slug": "El slug solo puede tener minúsculas, números y guiones.",
            "promotions_pay_lt_buy": "En la promo, lo que se paga tiene que ser menos de lo que se lleva.",
            "promotions_dates": "La promo tiene que terminar después de empezar.",
            "free_from": "El envío gratis tiene que ser desde un monto mayor a 0.",
        }
        for key, text in rules.items():
            if key in message or key in details:
                return text
        return "Algún valor no es válido para la base de datos."
    if status in (401, 403):
        return "La base rechazó la clave. Revisá SUPABASE_SECRET_KEY en admin/.env."
    return message or f"Error {status} de Supabase."


class Api:
    def __init__(self, config: Config):
        self.config = config
        self.rest = f"{config.supabase_url}/rest/v1"
        self.storage = f"{config.supabase_url}/storage/v1"
        self.public_prefix = f"{self.storage}/object/public/{BUCKET}/"
        self.session = requests.Session()
        headers = {"apikey": config.secret_key}
        # Las claves viejas (JWT) también van en Authorization; las nuevas (sb_secret_…) solo en apikey.
        if config.secret_key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {config.secret_key}"
        self.session.headers.update(headers)
        self._provincias: list[dict[str, str]] | None = None
        self._departamentos: dict[str, list[dict[str, str]]] = {}

    # ---------- PostgREST ----------
    def _check(self, response: requests.Response) -> Any:
        if response.status_code >= 400:
            try:
                payload = response.json()
            except ValueError:
                payload = {"message": response.text}
            raise ApiError(friendly_error(payload if isinstance(payload, dict) else {}, response.status_code))
        if not response.content:
            return None
        return response.json()

    def _request(self, method: str, url: str, **kwargs) -> Any:
        try:
            response = self.session.request(method, url, timeout=20, **kwargs)
        except requests.RequestException as exc:
            raise ApiError(f"No se pudo conectar con Supabase ({self.config.supabase_url}).\n¿Está levantada la base?") from exc
        return self._check(response)

    @staticmethod
    def _filters(match: dict[str, Any]) -> dict[str, str]:
        return {key: f"eq.{value}" for key, value in match.items()}

    def select(self, table: str, **params: str) -> list[dict[str, Any]]:
        params.setdefault("select", "*")
        return self._request("GET", f"{self.rest}/{table}", params=params)

    def insert(self, table: str, rows: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
        return self._request("POST", f"{self.rest}/{table}", json=rows, headers={"Prefer": "return=representation"})

    def update(self, table: str, match: dict[str, Any], values: dict[str, Any]) -> list[dict[str, Any]]:
        return self._request(
            "PATCH", f"{self.rest}/{table}", params=self._filters(match), json=values,
            headers={"Prefer": "return=representation"},
        )

    def delete(self, table: str, match: dict[str, Any]) -> None:
        self._request("DELETE", f"{self.rest}/{table}", params=self._filters(match))

    # ---------- Catálogo ----------
    def categories(self) -> list[dict[str, Any]]:
        return self.select("categories", order="sort_order,label")

    def products(self) -> list[dict[str, Any]]:
        return self.select("products", order="sort_order,created_at")

    def promotions(self) -> list[dict[str, Any]]:
        return self.select("promotions", order="starts_at.desc")

    def shipping_zones(self) -> list[dict[str, Any]]:
        return self.select("shipping_zones", select="*,shipping_zone_areas(id,provincia_id,departamento_id)", order="sort_order,name")

    def count_products_in(self, category_slug: str) -> int:
        return len(self.select("products", select="id", category_slug=f"eq.{category_slug}"))

    # ---------- Imágenes ----------
    def upload_image(self, path: str | Path, folder: str, name: str) -> str:
        """Achica la foto, la pasa a webp y la sube al bucket. Devuelve la URL pública."""
        try:
            with Image.open(path) as img:
                img = ImageOps.exif_transpose(img)
                img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
                img.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
                buffer = io.BytesIO()
                img.save(buffer, "WEBP", quality=85, method=6)
        except OSError as exc:
            raise ApiError(f"No se pudo abrir la imagen {Path(path).name}.") from exc
        key = f"{folder}/{slugify(name) or 'imagen'}-{uuid.uuid4().hex[:8]}.webp"
        self._request(
            "POST", f"{self.storage}/object/{BUCKET}/{key}", data=buffer.getvalue(),
            headers={"Content-Type": "image/webp", "Cache-Control": "max-age=31536000"},
        )
        return self.public_prefix + key

    def is_ours(self, url: str) -> bool:
        return url.startswith(self.public_prefix)

    def delete_unused_images(self, urls: Iterable[str]) -> None:
        """Borra del bucket las imágenes propias que ya no usa ningún producto ni categoría."""
        candidates = {u for u in urls if self.is_ours(u)}
        if not candidates:
            return
        in_use: set[str] = set()
        for p in self.select("products", select="images"):
            in_use.update(p["images"])
        for c in self.select("categories", select="image_url"):
            in_use.add(c["image_url"])
        keys = [u[len(self.public_prefix):] for u in candidates - in_use]
        if keys:
            self._request("DELETE", f"{self.storage}/object/{BUCKET}", json={"prefixes": keys})

    def fetch_bytes(self, url: str) -> bytes:
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        return response.content

    # ---------- Sitio ----------
    def revalidate_site(self) -> bool:
        """Pide al sitio que vuelva a leer el catálogo ya. Devuelve False si no se pudo."""
        if not (self.config.site_url and self.config.revalidate_secret):
            return False
        try:
            response = requests.post(
                f"{self.config.site_url}/api/revalidate/",
                headers={"x-revalidate-secret": self.config.revalidate_secret}, timeout=10,
            )
            return response.ok
        except requests.RequestException:
            return False

    # ---------- Georef (mismos ids que usa el sitio para las zonas) ----------
    def provincias(self) -> list[dict[str, str]]:
        if self._provincias is None:
            data = requests.get(f"{GEOREF}/provincias", params={"campos": "id,nombre", "max": 30, "orden": "nombre"}, timeout=20)
            data.raise_for_status()
            self._provincias = data.json()["provincias"]
        return self._provincias

    def departamentos(self, provincia_id: str) -> list[dict[str, str]]:
        if provincia_id not in self._departamentos:
            data = requests.get(
                f"{GEOREF}/departamentos",
                params={"provincia": provincia_id, "campos": "id,nombre", "max": 500, "orden": "nombre"}, timeout=20,
            )
            data.raise_for_status()
            self._departamentos[provincia_id] = data.json()["departamentos"]
        return self._departamentos[provincia_id]
