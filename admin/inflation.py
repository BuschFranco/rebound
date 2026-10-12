"""Inflación mensual de Argentina (IPC de INDEC) para comparar ganancias contra la suba de precios.

Fuente: API pública de ArgentinaDatos (sin clave). Se guarda en admin/.cache/ un día; sin internet se usa
lo último guardado. Los meses que INDEC todavía no publicó se proyectan con el último dato ("estimado").
"""

from __future__ import annotations

import calendar
import json
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

import requests

SOURCE = "https://api.argentinadatos.com/v1/finanzas/indices/inflacion"
CACHE = Path(__file__).resolve().parent / ".cache" / "inflacion.json"
MAX_AGE = 24 * 60 * 60


@dataclass(frozen=True)
class Growth:
    """Suba acumulada entre dos fechas: factor 1.12 = 12 %. `estimated` si usa meses proyectados."""

    factor: float
    estimated: bool

    @property
    def percent(self) -> float:
        return (self.factor - 1) * 100


class Inflation:
    def __init__(self, monthly: dict[tuple[int, int], float]):
        # (año, mes) -> tasa del mes (0.021 = 2,1 %)
        self.monthly = monthly
        self.last = max(monthly) if monthly else None

    @property
    def available(self) -> bool:
        return self.last is not None

    @property
    def last_label(self) -> str:
        if not self.last:
            return "sin datos"
        y, m = self.last
        return f"{MONTHS[m - 1]} {y}: {self.monthly[self.last] * 100:.1f} %".replace(".", ",")

    def rate(self, year: int, month: int) -> tuple[float, bool]:
        if (year, month) in self.monthly:
            return self.monthly[(year, month)], False
        if self.last and (year, month) > self.last:
            return self.monthly[self.last], True
        # Antes del primer dato (no debería pasar: la serie arranca en 1943).
        return 0.0, True

    def between(self, start: date | datetime, end: date | datetime) -> Growth:
        """Inflación acumulada entre dos fechas (proporcional a los días de cada mes)."""
        start = start.date() if isinstance(start, datetime) else start
        end = end.date() if isinstance(end, datetime) else end
        if not self.available or end <= start:
            return Growth(1.0, not self.available)
        factor, estimated = 1.0, False
        cursor = start
        while cursor < end:
            days_in_month = calendar.monthrange(cursor.year, cursor.month)[1]
            month_end = date(cursor.year, cursor.month, days_in_month) + timedelta(days=1)
            stop = min(month_end, end)
            rate, guess = self.rate(cursor.year, cursor.month)
            factor *= (1 + rate) ** ((stop - cursor).days / days_in_month)
            estimated |= guess
            cursor = stop
        return Growth(factor, estimated)

    def ahead(self, months: int, today: date | None = None) -> Growth:
        """Proyección desde hoy (con los datos más recientes) a N meses."""
        today = today or date.today()
        y, m = today.year, today.month + months
        y += (m - 1) // 12
        m = (m - 1) % 12 + 1
        day = min(today.day, calendar.monthrange(y, m)[1])
        return self.between(today, date(y, m, day))


MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre",
          "noviembre", "diciembre"]


def _parse(rows: list[dict]) -> dict[tuple[int, int], float]:
    out: dict[tuple[int, int], float] = {}
    for row in rows:
        try:
            d = date.fromisoformat(str(row["fecha"])[:10])
            out[(d.year, d.month)] = float(row["valor"]) / 100
        except (KeyError, ValueError, TypeError):
            continue
    return out


def load_inflation() -> Inflation:
    """Descarga la serie (o usa la caché). Nunca falla: sin datos devuelve una serie vacía."""
    cached: list[dict] | None = None
    if CACHE.exists():
        try:
            cached = json.loads(CACHE.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            cached = None
        if cached is not None and time.time() - CACHE.stat().st_mtime < MAX_AGE:
            return Inflation(_parse(cached))
    try:
        response = requests.get(SOURCE, timeout=15)
        response.raise_for_status()
        rows = response.json()
        if isinstance(rows, list) and rows:
            CACHE.parent.mkdir(exist_ok=True)
            CACHE.write_text(json.dumps(rows), encoding="utf-8")
            return Inflation(_parse(rows))
    except (requests.RequestException, ValueError, OSError):
        pass
    return Inflation(_parse(cached or []))
