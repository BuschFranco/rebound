"""Pedidos: lo que se envió por WhatsApp (registro anónimo) para saber qué se vende y qué reponer."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any

import customtkinter as ctk

from db import AR_TZ, parse_ts
from widgets import ACCENT, MUTED, SURFACE, format_price, ghost_button, hint

if TYPE_CHECKING:
    from app import AdminApp

PERIODS = {"7 días": 7, "30 días": 30, "90 días": 90}


class OrdersView(ctk.CTkFrame):
    def __init__(self, master, app: "AdminApp"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.api = app.api

        top = ctk.CTkFrame(self, fg_color="transparent")
        top.pack(fill="x")
        ctk.CTkLabel(top, text="Pedidos por WhatsApp", font=ctk.CTkFont(size=22, weight="bold")).pack(side="left")
        ghost_button(top, "↻ Actualizar", self.load, width=110).pack(side="right")
        self.period = ctk.CTkSegmentedButton(top, values=list(PERIODS), command=lambda _v: self.load())
        self.period.set("30 días")
        self.period.pack(side="right", padx=10)
        hint(self, "Se registra cada vez que alguien toca “Comprar por WhatsApp”, después de verificar el pedido. "
                   "No incluye datos personales. Son intenciones de compra: algunas pueden no concretarse en el chat.") \
            .pack(anchor="w", pady=(2, 10))

        self.cards = ctk.CTkFrame(self, fg_color="transparent")
        self.cards.pack(fill="x")
        self.metrics: dict[str, ctk.CTkLabel] = {}
        for i, (key, label) in enumerate((("orders", "Pedidos"), ("units", "Unidades"), ("total", "Monto total"),
                                          ("avg", "Ticket promedio"))):
            card = ctk.CTkFrame(self.cards, fg_color=SURFACE, corner_radius=10)
            card.grid(row=0, column=i, sticky="ew", padx=(0, 10))
            self.cards.grid_columnconfigure(i, weight=1)
            ctk.CTkLabel(card, text=label.upper(), text_color=MUTED, font=ctk.CTkFont(size=11, weight="bold")) \
                .pack(anchor="w", padx=14, pady=(12, 0))
            value = ctk.CTkLabel(card, text="—", font=ctk.CTkFont(size=26, weight="bold"), text_color=ACCENT)
            value.pack(anchor="w", padx=14, pady=(0, 12))
            self.metrics[key] = value

        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, pady=(12, 0))
        for i in range(3):
            body.grid_columnconfigure(i, weight=1 if i < 2 else 2)
        body.grid_rowconfigure(0, weight=1)
        self.top_products = self._panel(body, 0, "Productos más pedidos")
        self.top_sizes = self._panel(body, 1, "Talles más pedidos")
        self.recent = self._panel(body, 2, "Últimos pedidos")

    def _panel(self, master, column: int, title: str) -> ctk.CTkTextbox:
        frame = ctk.CTkFrame(master, fg_color=SURFACE, corner_radius=10)
        frame.grid(row=0, column=column, sticky="nsew", padx=(0, 10))
        ctk.CTkLabel(frame, text=title.upper(), text_color=ACCENT, font=ctk.CTkFont(size=12, weight="bold")) \
            .pack(anchor="w", padx=14, pady=(12, 4))
        box = ctk.CTkTextbox(frame, fg_color="transparent", wrap="none", font=ctk.CTkFont(family="Consolas", size=12))
        box.pack(fill="both", expand=True, padx=8, pady=(0, 10))
        box.configure(state="disabled")
        return box

    def load(self):
        days = PERIODS[self.period.get()]
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        def fetch():
            return self.api.select("order_intents", created_at=f"gte.{since}", order="created_at.desc", limit="2000")

        self.app.tasks.run(fetch, self._show)

    @staticmethod
    def _write(box: ctk.CTkTextbox, lines: list[str]):
        box.configure(state="normal")
        box.delete("1.0", "end")
        box.insert("1.0", "\n".join(lines) if lines else "Todavía no hay pedidos en este período.")
        box.configure(state="disabled")

    def _show(self, orders: list[dict[str, Any]]):
        units = sum(o["units"] for o in orders)
        total = sum(o["total"] for o in orders)
        self.metrics["orders"].configure(text=str(len(orders)))
        self.metrics["units"].configure(text=str(units))
        self.metrics["total"].configure(text=format_price(total) if orders else "—")
        self.metrics["avg"].configure(text=format_price(round(total / len(orders))) if orders else "—")

        by_product: Counter[str] = Counter()
        by_size: Counter[str] = Counter()
        for o in orders:
            for item in o["items"]:
                quantity = int(item.get("quantity", 0))
                by_product[item.get("name", "?")] += quantity
                by_size[f"{item.get('name', '?')[:22]} · {item.get('size', '?')}"] += quantity

        self._write(self.top_products, [f"{n:>4} u.  {name[:32]}" for name, n in by_product.most_common(15)])
        self._write(self.top_sizes, [f"{n:>4} u.  {label}" for label, n in by_size.most_common(15)])

        recent = []
        for o in orders[:60]:
            when = parse_ts(o["created_at"]).astimezone(AR_TZ).strftime("%d/%m %H:%M")
            where = o.get("zone_name") or o.get("partido") or "sin dirección"
            promo = f" · {o['promo_label']}" if o.get("promo_label") else ""
            detail = ", ".join(f"{i.get('quantity')}× {i.get('name', '?')[:18]} {i.get('size', '')}" for i in o["items"])
            recent.append(f"{when}  {format_price(o['total']):>10}  {where[:20]}{promo}")
            recent.append(f"             {detail[:90]}")
        self._write(self.recent, recent)
