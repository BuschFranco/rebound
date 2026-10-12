"""Pedidos y ventas.

- Pedidos: lo que se envió por WhatsApp (registro anónimo). Cada uno se marca "Vendido" (registra la venta y
  descuenta stock) o "No se concretó".
- Ventas: las confirmadas desde un pedido y las cargadas a mano (en persona, Instagram…). Se pueden anular.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from tkinter import messagebox
from typing import TYPE_CHECKING, Any

import customtkinter as ctk

from db import AR_TZ, parse_ts
from inventory import build_stock
from views.sale_dialog import SaleDialog
from widgets import (ACCENT, DANGER, MUTED, OK, SURFACE, SURFACE_2, clip, format_price, ghost_button, hint,
                     primary_button)

if TYPE_CHECKING:
    from app import AdminApp

PERIODS = {"7 días": 7, "30 días": 30, "90 días": 90, "1 año": 365}
LISTS = ("Pendientes", "Todos los pedidos", "Ventas")
STATUS = {"pending": ("Pendiente", ACCENT), "sold": ("✓ Vendido", OK), "cancelled": ("✕ No se concretó", MUTED)}


def when(ts: str) -> str:
    return parse_ts(ts).astimezone(AR_TZ).strftime("%d/%m %H:%M")


class OrdersView(ctk.CTkFrame):
    def __init__(self, master, app: "AdminApp"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.api = app.api
        self.orders: list[dict[str, Any]] = []
        self.sales: list[dict[str, Any]] = []
        self.stocks = {}

        top = ctk.CTkFrame(self, fg_color="transparent")
        top.pack(fill="x")
        ctk.CTkLabel(top, text="Pedidos y ventas", font=ctk.CTkFont(size=22, weight="bold")).pack(side="left")
        ghost_button(top, "↻ Actualizar", self.load, width=110).pack(side="right")
        primary_button(top, "+ Venta manual", self.manual_sale, width=140).pack(side="right", padx=(10, 0))
        self.period = ctk.CTkSegmentedButton(top, values=list(PERIODS), command=lambda _v: self._render())
        self.period.set("30 días")
        self.period.pack(side="right", padx=10)
        hint(self, "Los pedidos se registran cuando alguien toca “Comprar por WhatsApp” (sin datos personales). "
                   "Cuando se concreta en el chat, tocá “Vendido”: queda la venta, se descuenta el stock y se calcula "
                   "la ganancia. Las ventas por fuera de la web se cargan con “+ Venta manual”.", ) \
            .pack(anchor="w", pady=(2, 10))

        self.cards = ctk.CTkFrame(self, fg_color="transparent")
        self.cards.pack(fill="x")
        self.metrics: dict[str, ctk.CTkLabel] = {}
        for i, (key, label) in enumerate((("orders", "Pedidos web"), ("pending", "Sin confirmar"),
                                          ("sales", "Ventas"), ("revenue", "Facturado"), ("profit", "Ganancia"))):
            card = ctk.CTkFrame(self.cards, fg_color=SURFACE, corner_radius=10)
            card.grid(row=0, column=i, sticky="ew", padx=(0, 10))
            self.cards.grid_columnconfigure(i, weight=1)
            ctk.CTkLabel(card, text=label.upper(), text_color=MUTED, font=ctk.CTkFont(size=11, weight="bold")) \
                .pack(anchor="w", padx=14, pady=(12, 0))
            value = ctk.CTkLabel(card, text="—", font=ctk.CTkFont(size=24, weight="bold"), text_color=ACCENT)
            value.pack(anchor="w", padx=14, pady=(0, 12))
            self.metrics[key] = value

        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, pady=(12, 0))
        body.grid_columnconfigure(0, weight=1)
        body.grid_columnconfigure(1, weight=2)
        body.grid_rowconfigure(0, weight=1)
        body.grid_rowconfigure(1, weight=1)
        self.top_products = self._panel(body, 0, "Productos más pedidos")
        self.top_sizes = self._panel(body, 1, "Talles más pedidos")

        right = ctk.CTkFrame(body, fg_color=SURFACE, corner_radius=10)
        right.grid(row=0, column=1, rowspan=2, sticky="nsew")
        self.list_kind = ctk.CTkSegmentedButton(right, values=list(LISTS), command=lambda _v: self._render_list())
        self.list_kind.set(LISTS[0])
        self.list_kind.pack(anchor="w", padx=12, pady=(12, 6))
        self.rows = ctk.CTkScrollableFrame(right, fg_color="transparent")
        self.rows.pack(fill="both", expand=True, padx=6, pady=(0, 8))

    def _panel(self, master, row: int, title: str) -> ctk.CTkTextbox:
        frame = ctk.CTkFrame(master, fg_color=SURFACE, corner_radius=10)
        frame.grid(row=row, column=0, sticky="nsew", padx=(0, 10), pady=(0, 10 if row == 0 else 0))
        ctk.CTkLabel(frame, text=title.upper(), text_color=ACCENT, font=ctk.CTkFont(size=12, weight="bold")) \
            .pack(anchor="w", padx=14, pady=(12, 4))
        box = ctk.CTkTextbox(frame, fg_color="transparent", wrap="none", font=ctk.CTkFont(family="Consolas", size=12))
        box.pack(fill="both", expand=True, padx=8, pady=(0, 10))
        box.configure(state="disabled")
        return box

    # ---------- Datos ----------
    def load(self):
        since = (datetime.now(timezone.utc) - timedelta(days=max(PERIODS.values()))).isoformat()

        def fetch():
            orders = self.api.select_all("order_intents", created_at=f"gte.{since}", order="created_at.desc")
            return orders, self.api.sales(), self.api.products(), self.api.movements()

        self.app.tasks.run(fetch, self._loaded)

    def _loaded(self, data):
        self.orders, self.sales, products, movements = data
        self.stocks = build_stock(products, movements)
        self._render()

    def _since(self) -> datetime:
        return datetime.now(timezone.utc) - timedelta(days=PERIODS[self.period.get()])

    def _render(self):
        since = self._since()
        orders = [o for o in self.orders if parse_ts(o["created_at"]) >= since]
        sales = [s for s in self.sales if not s.get("cancelled_at") and parse_ts(s["sold_at"]) >= since]
        revenue = sum(s["revenue"] for s in sales)
        self.metrics["orders"].configure(text=str(len(orders)))
        self.metrics["pending"].configure(text=str(sum(1 for o in orders if o.get("status", "pending") == "pending")))
        self.metrics["sales"].configure(text=str(len(sales)))
        self.metrics["revenue"].configure(text=format_price(revenue) if sales else "—")
        self.metrics["profit"].configure(text=format_price(revenue - sum(s["cost"] for s in sales)) if sales else "—")

        by_product: Counter[str] = Counter()
        by_size: Counter[str] = Counter()
        for o in orders:
            for item in o["items"]:
                quantity = int(item.get("quantity", 0))
                by_product[item.get("name", "?")] += quantity
                by_size[f"{item.get('name', '?')[:22]} · {item.get('size', '?')}"] += quantity
        self._write(self.top_products, [f"{n:>4} u.  {name[:32]}" for name, n in by_product.most_common(15)])
        self._write(self.top_sizes, [f"{n:>4} u.  {label}" for label, n in by_size.most_common(15)])
        self._render_list()

    @staticmethod
    def _write(box: ctk.CTkTextbox, lines: list[str]):
        box.configure(state="normal")
        box.delete("1.0", "end")
        box.insert("1.0", "\n".join(lines) if lines else "Todavía no hay pedidos en este período.")
        box.configure(state="disabled")

    # ---------- Listas ----------
    def _render_list(self):
        for child in self.rows.winfo_children():
            child.destroy()
        since = self._since()
        kind = self.list_kind.get()
        if kind == "Ventas":
            items = [s for s in self.sales if parse_ts(s["sold_at"]) >= since]
            for s in items[:200]:
                self._sale_row(s)
        else:
            items = [o for o in self.orders if parse_ts(o["created_at"]) >= since
                     and (kind != "Pendientes" or o.get("status", "pending") == "pending")]
            for o in items[:200]:
                self._order_row(o)
        if not items:
            hint(self.rows, "No hay nada en este período.").pack(anchor="w", padx=8, pady=8)

    def _card(self) -> ctk.CTkFrame:
        card = ctk.CTkFrame(self.rows, fg_color=SURFACE_2, corner_radius=8)
        card.pack(fill="x", pady=3, padx=2)
        return card

    def _order_row(self, o: dict[str, Any]):
        card = self._card()
        text = ctk.CTkFrame(card, fg_color="transparent")
        text.pack(side="left", fill="x", expand=True, padx=12, pady=8)
        where = o.get("zone_name") or o.get("partido") or "sin dirección"
        promo = f" · {o['promo_label']}" if o.get("promo_label") else ""
        ctk.CTkLabel(text, text=f"{when(o['created_at'])}   {format_price(o['total'])}   {clip(where, 22)}{promo}",
                     anchor="w", font=ctk.CTkFont(weight="bold")).pack(anchor="w")
        detail = ", ".join(f"{i.get('quantity')}× {clip(i.get('name', '?'), 22)} {i.get('color', '')} {i.get('size', '')}"
                           for i in o["items"])
        ctk.CTkLabel(text, text=clip(detail, 110), anchor="w", text_color=MUTED, font=ctk.CTkFont(size=12)).pack(anchor="w")

        status = o.get("status", "pending")
        actions = ctk.CTkFrame(card, fg_color="transparent")
        actions.pack(side="right", padx=10)
        if status == "pending":
            primary_button(actions, "Vendido", lambda: self.confirm(o), width=90).pack(side="left")
            ghost_button(actions, "No se concretó", lambda: self.set_status(o, "cancelled"), width=120) \
                .pack(side="left", padx=(6, 0))
        else:
            label, color = STATUS[status]
            ctk.CTkLabel(actions, text=label, text_color=color, font=ctk.CTkFont(weight="bold")).pack(side="left", padx=6)
            if status == "cancelled":
                ghost_button(actions, "Reabrir", lambda: self.set_status(o, "pending"), width=80).pack(side="left")

    def _sale_row(self, s: dict[str, Any]):
        card = self._card()
        text = ctk.CTkFrame(card, fg_color="transparent")
        text.pack(side="left", fill="x", expand=True, padx=12, pady=8)
        source = "Web" if s["source"] == "web" else "Manual"
        profit = s["revenue"] - s["cost"]
        pct = f" ({profit / s['revenue'] * 100:.0f} %)" if s["revenue"] else ""
        note = f" · {s['note']}" if s.get("note") else ""
        ctk.CTkLabel(text, text=f"{when(s['sold_at'])}   {format_price(s['revenue'])}   {source}{note}", anchor="w",
                     font=ctk.CTkFont(weight="bold"), text_color=MUTED if s.get("cancelled_at") else None).pack(anchor="w")
        detail = ", ".join(f"{i.get('quantity')}× {clip(i.get('name', '?'), 22)} {i.get('color', '')} {i.get('size', '')}"
                           for i in s["items"])
        ctk.CTkLabel(text, text=clip(detail, 90) + f"   ·   ganancia {format_price(profit)}{pct}", anchor="w",
                     text_color=MUTED, font=ctk.CTkFont(size=12)).pack(anchor="w")
        actions = ctk.CTkFrame(card, fg_color="transparent")
        actions.pack(side="right", padx=10)
        if s.get("cancelled_at"):
            ctk.CTkLabel(actions, text="Anulada", text_color=DANGER).pack()
        else:
            ghost_button(actions, "Anular", lambda: self.cancel(s), width=80).pack()

    # ---------- Acciones ----------
    def _after_change(self, what: str):
        def done(revalidated):
            self.app.changed(self, what, revalidated)
            self.app.stock_changed()

        self.app.tasks.run(self.api.revalidate_site, done)

    def confirm(self, order: dict[str, Any]):
        SaleDialog(self, api=self.api, tasks=self.app.tasks, stocks=self.stocks, on_done=self._after_change, order=order)

    def manual_sale(self):
        if not self.stocks:
            messagebox.showinfo("Cargando", "Esperá a que terminen de cargar los productos.")
            return
        SaleDialog(self, api=self.api, tasks=self.app.tasks, stocks=self.stocks, on_done=self._after_change)

    def set_status(self, order: dict[str, Any], status: str):
        def done(_):
            order["status"] = status
            self._render()
            self.app.status("✓ Pedido marcado como " + STATUS[status][0].lstrip("✓✕ ").lower(), "ok")

        self.app.tasks.run(lambda: self.api.set_order_status(order["id"], status), done)

    def cancel(self, sale: dict[str, Any]):
        if not messagebox.askyesno("Anular venta", f"¿Anular la venta de {format_price(sale['revenue'])}?\n"
                                   "El stock vuelve y, si venía de un pedido de la web, el pedido queda pendiente."):
            return
        self.app.tasks.run(lambda: self.api.cancel_sale(sale["id"]), lambda _: self._after_change("Venta anulada"))
