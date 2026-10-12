"""Cálculos de stock, costo y ganancia (sin interfaz, para poder probarlos solos).

- El stock de cada variante (color + talle) es la suma de sus movimientos.
- El costo de un producto es el promedio ponderado de lo que pagaste por las unidades que tenés:
  si comprás 10 a $10.000 y después 10 a $12.000, el costo pasa a $11.000. Vender no lo cambia.
- La ganancia se mide sobre el precio de venta (margen) y sobre el costo (markup):
  comprar a $10.000 y vender a $20.000 es 50 % de margen y 100 % de markup.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable

from db import parse_ts

# Margen sobre el precio de venta. Tiene que cubrir promos, envíos gratis, cambios, publicidad e inflación
# hasta que reponés la mercadería. Cambialos acá si tu rubro trabaja con otros números.
HEALTHY_MARGIN = 0.40
FAIR_MARGIN = 0.25

HEALTH = {
    "good": ("Saludable", "#25d366"),
    "fair": ("Justo", "#f5c542"),
    "low": ("Poco margen", "#ff4d4f"),
    "none": ("Sin costo cargado", "#9a93a8"),
}


def margin(price: float, cost: float) -> float:
    """Ganancia sobre el precio de venta (0.5 = 50 %)."""
    return (price - cost) / price if price > 0 else 0.0


def markup(price: float, cost: float) -> float:
    """Ganancia sobre el costo (1.0 = 100 %)."""
    return (price - cost) / cost if cost > 0 else 0.0


def health(margin_value: float | None) -> str:
    if margin_value is None:
        return "none"
    if margin_value >= HEALTHY_MARGIN:
        return "good"
    if margin_value >= FAIR_MARGIN:
        return "fair"
    return "low"


def price_for_margin(cost: float, target: float) -> int:
    """Precio mínimo para ganar `target` sobre el precio (redondeado hacia arriba a $100)."""
    raw = cost / (1 - target)
    return int(-(-raw // 100) * 100)


def variant_key(color: str, size: str) -> str:
    return f"{color}|{size}"


# ---------- Promos ----------
def is_running(promo: dict[str, Any], now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    return bool(promo.get("active")) and parse_ts(promo["starts_at"]) <= now < parse_ts(promo["ends_at"])


@dataclass(frozen=True)
class PromoImpact:
    """Cómo queda el precio con una promo de descuento, en el peor caso para vos."""

    label: str
    factor: float  # precio efectivo por unidad = precio × factor
    detail: str


def promo_impacts(product: dict[str, Any], promos: Iterable[dict[str, Any]]) -> list[PromoImpact]:
    """Promos de descuento que le aplican al producto, con el precio efectivo si el cliente las aprovecha al máximo."""
    out = []
    for p in promos:
        kind = p.get("kind") or "nxm"
        if kind == "nxm" and p.get("buy") and p.get("pay"):
            buy, pay = int(p["buy"]), int(p["pay"])
            out.append(PromoImpact(p.get("label") or f"{buy}x{pay}", pay / buy, f"llevando {buy} cobrás {pay}"))
        elif kind == "nth_discount" and p.get("nth") and p.get("percent"):
            if p.get("scope") == "categories" and product.get("category_slug") not in (p.get("category_slugs") or []):
                continue
            nth, percent = int(p["nth"]), int(p["percent"])
            out.append(PromoImpact(p.get("label") or f"{nth}° al {percent} %", (nth - percent / 100) / nth,
                                   f"llevando {nth}, una sale {percent} % off"))
    return sorted(out, key=lambda i: i.factor)


# ---------- Stock y costo ----------
@dataclass
class ProductStock:
    product: dict[str, Any]
    tracked: bool = False
    by_variant: dict[str, int] = field(default_factory=dict)
    avg_cost: float | None = None
    # Fecha "promedio" de compra de las unidades en stock (para ajustar el costo por inflación).
    cost_date: datetime | None = None
    last_purchase: datetime | None = None
    last_sale: datetime | None = None
    sold_units: int = 0

    @property
    def units(self) -> int:
        return sum(q for q in self.by_variant.values() if q > 0)

    def qty(self, color: str, size: str) -> int:
        return self.by_variant.get(variant_key(color, size), 0)

    def variants(self) -> list[tuple[str, str]]:
        return [(c["name"], s) for c in self.product.get("colors", []) for s in self.product.get("sizes", [])]

    @property
    def out_of_stock(self) -> list[tuple[str, str]]:
        return [v for v in self.variants() if self.qty(*v) <= 0]

    @property
    def last_one(self) -> list[tuple[str, str]]:
        return [v for v in self.variants() if self.qty(*v) == 1]

    @property
    def negative(self) -> list[tuple[str, str]]:
        return [v for v in self.variants() if self.qty(*v) < 0]


def build_stock(products: Iterable[dict[str, Any]], movements: Iterable[dict[str, Any]]) -> dict[str, ProductStock]:
    """Stock, costo promedio y fechas de cada producto a partir de todos los movimientos."""
    stocks = {p["id"]: ProductStock(p) for p in products}
    ordered = sorted(movements, key=lambda m: (m["happened_at"], m["id"]))
    for m in ordered:
        s = stocks.get(m["product_id"])
        if s is None:
            continue
        s.tracked = True
        when = parse_ts(m["happened_at"])
        key = variant_key(m["color"], m["size"])
        qty = int(m["quantity"])
        if m["kind"] == "purchase":
            held = max(s.units, 0)
            cost = float(m["unit_cost"] or 0)
            if s.avg_cost is None or held == 0:
                s.avg_cost, s.cost_date = cost, when
            else:
                s.avg_cost = (held * s.avg_cost + qty * cost) / (held + qty)
                # Promedio ponderado de las fechas (en segundos).
                base = s.cost_date or when
                s.cost_date = datetime.fromtimestamp(
                    (held * base.timestamp() + qty * when.timestamp()) / (held + qty), tz=timezone.utc)
            s.last_purchase = when
        elif m["kind"] == "sale":
            s.last_sale = when
            s.sold_units += -qty
        elif m["kind"] == "return" and m.get("sale_id"):
            s.sold_units -= qty
        s.by_variant[key] = s.by_variant.get(key, 0) + qty
    return stocks


# ---------- Ventas ----------
@dataclass
class SaleLine:
    product_id: str
    name: str
    color: str
    size: str
    quantity: int
    list_price: int  # precio publicado por unidad
    price: int = 0  # cobrado por unidad (con el descuento repartido)
    unit_cost: int = 0


def distribute(lines: list[SaleLine], revenue: int) -> None:
    """Reparte lo cobrado por productos entre las líneas, proporcional al precio publicado."""
    total = sum(l.list_price * l.quantity for l in lines)
    if total <= 0:
        for l in lines:
            l.price = 0
        return
    for l in lines:
        l.price = round(l.list_price * revenue / total)


def sale_payload(lines: list[SaleLine], revenue: int, *, source: str, sold_at: datetime,
                 order_intent_id: int | None = None, note: str = "") -> dict[str, Any]:
    distribute(lines, revenue)
    return {
        "source": source,
        "sold_at": sold_at.isoformat(),
        "order_intent_id": order_intent_id,
        "revenue": revenue,
        "note": note,
        "items": [
            {"product_id": l.product_id, "name": l.name, "color": l.color, "size": l.size, "quantity": l.quantity,
             "price": l.price, "unit_cost": l.unit_cost}
            for l in lines if l.quantity > 0
        ],
    }
