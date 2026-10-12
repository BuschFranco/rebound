"""Stock por talle y color: compras, ajustes e historial de cada producto."""

from __future__ import annotations

from datetime import datetime
from tkinter import messagebox
from typing import TYPE_CHECKING, Any

import customtkinter as ctk

from db import AR_TZ, parse_ts
from inventory import ProductStock, build_stock, variant_key
from widgets import (ACCENT, DANGER, MUTED, OK, SURFACE, SURFACE_2, DateTimeEntry, ListPanel, format_price,
                     ghost_button, hint, parse_int, primary_button, section_title)

if TYPE_CHECKING:
    from app import AdminApp

KIND_LABEL = {"purchase": "Compra", "sale": "Venta", "adjust": "Ajuste", "return": "Devolución"}


def qty_color(qty: int) -> str:
    return DANGER if qty <= 0 else ACCENT if qty == 1 else OK


class VariantGrid(ctk.CTkFrame):
    """Tabla colores × talles. Solo lectura (muestra unidades) o editable (un campo por variante)."""

    def __init__(self, master, product: dict[str, Any], values: dict[str, int] | None = None, *,
                 editable: bool = False, on_change=None):
        super().__init__(master, fg_color=SURFACE, corner_radius=10)
        self.entries: dict[str, ctk.CTkEntry] = {}
        values = values or {}
        colors = [c["name"] for c in product.get("colors", [])]
        sizes = product.get("sizes", [])
        ctk.CTkLabel(self, text="", width=110).grid(row=0, column=0)
        for j, size in enumerate(sizes, start=1):
            ctk.CTkLabel(self, text=size, text_color=MUTED, font=ctk.CTkFont(weight="bold")) \
                .grid(row=0, column=j, padx=4, pady=(10, 4))
        for i, color in enumerate(colors, start=1):
            ctk.CTkLabel(self, text=color, anchor="w", width=110).grid(row=i, column=0, sticky="w", padx=(12, 6), pady=3)
            for j, size in enumerate(sizes, start=1):
                key = variant_key(color, size)
                if editable:
                    entry = ctk.CTkEntry(self, width=58, justify="center")
                    if key in values:
                        entry.insert(0, str(values[key]))
                    if on_change:
                        entry.bind("<KeyRelease>", lambda _e: on_change())
                    entry.grid(row=i, column=j, padx=4, pady=3)
                    self.entries[key] = entry
                else:
                    qty = values.get(key, 0)
                    ctk.CTkLabel(self, text=str(qty), width=58, height=30, corner_radius=6, fg_color=SURFACE_2,
                                 text_color=qty_color(qty), font=ctk.CTkFont(size=14, weight="bold")) \
                        .grid(row=i, column=j, padx=4, pady=3)
        ctk.CTkLabel(self, text="").grid(row=len(colors) + 1, column=0, pady=2)

    def read(self, *, allow_negative: bool = False, allow_empty: bool = True) -> dict[str, int]:
        out: dict[str, int] = {}
        for key, entry in self.entries.items():
            text = entry.get().strip()
            if not text:
                if allow_empty:
                    continue
                raise ValueError(f"Completá la cantidad de {key.replace('|', ' ')}.")
            negative = allow_negative and text.startswith("-")
            value = parse_int(text.lstrip("-") if negative else text, f"La cantidad de {key.replace('|', ' ')}")
            out[key] = -value if negative else value
        return out


class StockView(ctk.CTkFrame):
    def __init__(self, master, app: "AdminApp"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.api = app.api
        self.products: list[dict[str, Any]] = []
        self.stocks: dict[str, ProductStock] = {}
        self.movements: list[dict[str, Any]] = []
        self.current: str | None = None

        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self.list = ListPanel(self, self.select, app.thumbs, "Buscar producto…", extra=self._list_extra)
        self.list.grid(row=0, column=0, sticky="ns", padx=(0, 12))
        self.list.grid_propagate(False)

        self.right = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.right.grid(row=0, column=1, sticky="nsew")
        self._empty()

    def _list_extra(self, box: ctk.CTkFrame):
        self.only_alerts = ctk.CTkCheckBox(box, text="Solo con faltantes", command=self._refresh_list)
        self.only_alerts.pack(anchor="w", pady=(0, 6))

    def _empty(self):
        for child in self.right.winfo_children():
            child.destroy()
        ctk.CTkLabel(self.right, text="Stock", font=ctk.CTkFont(size=22, weight="bold")).pack(anchor="w")
        hint(self.right, "Elegí un producto para ver sus unidades por color y talle, cargar una compra o ajustar.\n"
                         "Un producto empieza a controlarse por stock con su primera compra: desde ahí, en la web, "
                         "las variantes en 0 se marcan agotadas y las que tienen 1 muestran “¡Último disponible!”. "
                         "Los productos sin compras cargadas siguen como siempre.").pack(anchor="w", pady=(4, 0))

    # ---------- Datos ----------
    def load(self):
        def fetch():
            return self.api.products(), self.api.movements()

        self.app.tasks.run(fetch, self._loaded)

    def _loaded(self, data):
        self.products, self.movements = data
        self.stocks = build_stock(self.products, self.movements)
        self._refresh_list()
        if self.current and self.current in self.stocks:
            self.select(self.current)

    def _refresh_list(self):
        items = []
        for p in self.products:
            s = self.stocks[p["id"]]
            if s.tracked:
                alerts = []
                if s.negative:
                    alerts.append("⚠ negativo")
                if s.out_of_stock:
                    alerts.append(f"{len(s.out_of_stock)} sin stock")
                if s.last_one:
                    alerts.append(f"{len(s.last_one)} con 1")
                subtitle = f"{s.units} u. · " + (" · ".join(alerts) if alerts else "✓ todo con stock")
                has_alert = bool(alerts)
            else:
                subtitle, has_alert = "Sin control de stock", False
            if self.only_alerts.get() and not has_alert:
                continue
            items.append({"id": p["id"], "title": p["name"], "subtitle": subtitle, "search": p["name"],
                          "image": p["images"][0] if p["images"] else None, "dim": not p["active"]})
        self.list.set_items(items)

    # ---------- Detalle ----------
    def select(self, product_id: str):
        self.current = product_id
        self.list.select(product_id)
        s = self.stocks[product_id]
        p = s.product
        for child in self.right.winfo_children():
            child.destroy()

        head = ctk.CTkFrame(self.right, fg_color="transparent")
        head.pack(fill="x")
        ctk.CTkLabel(head, text=p["name"], font=ctk.CTkFont(size=22, weight="bold")).pack(side="left")
        primary_button(head, "+ Cargar compra", lambda: PurchaseDialog(self, s), width=150).pack(side="right")
        ghost_button(head, "Ajustar / contar", lambda: AdjustDialog(self, s), width=140).pack(side="right", padx=8)

        info = [f"Precio {format_price(p['price'])}"]
        if s.avg_cost is not None:
            info.append(f"Costo promedio {format_price(round(s.avg_cost))}")
        info.append(f"{s.units} unidades")
        if s.avg_cost is not None:
            info.append(f"Capital {format_price(round(s.avg_cost * s.units))} al costo")
        hint(self.right, "   ·   ".join(info) if s.tracked else "Todavía sin control de stock: cargá la primera compra "
             "para empezar. Las variantes que no cargues quedan en 0 (agotadas en la web).").pack(anchor="w", pady=(2, 10))

        section_title(self.right, "Unidades por color y talle").pack(anchor="w", pady=(4, 6))
        VariantGrid(self.right, p, s.by_variant).pack(anchor="w")
        legend = ctk.CTkFrame(self.right, fg_color="transparent")
        legend.pack(anchor="w", pady=(6, 0))
        for text, color in (("● 0 = agotado en la web", DANGER), ("● 1 = “¡Último disponible!”", ACCENT),
                            ("● 2 o más = disponible", OK)):
            ctk.CTkLabel(legend, text=text, text_color=color, font=ctk.CTkFont(size=11)).pack(side="left", padx=(0, 14))

        section_title(self.right, "Movimientos").pack(anchor="w", pady=(18, 6))
        rows = [m for m in self.movements if m["product_id"] == product_id][::-1]
        box = ctk.CTkTextbox(self.right, height=260, wrap="none", font=ctk.CTkFont(family="Consolas", size=12))
        box.pack(fill="x")
        lines = []
        for m in rows[:300]:
            when = parse_ts(m["happened_at"]).astimezone(AR_TZ).strftime("%d/%m/%y %H:%M")
            qty = f"{m['quantity']:+d}"
            cost = f" a {format_price(m['unit_cost'])}" if m.get("unit_cost") is not None and m["kind"] == "purchase" else ""
            note = f" · {m['note']}" if m.get("note") else ""
            lines.append(f"{when}  {KIND_LABEL.get(m['kind'], m['kind']):<10} {qty:>5}  {m['color']} {m['size']}{cost}{note}")
        box.insert("1.0", "\n".join(lines) if lines else "Sin movimientos todavía.")
        box.configure(state="disabled")

    def saved(self, what: str):
        def done(revalidated):
            self.app.changed(self, what, revalidated)
            self.app.stock_changed()

        self.app.tasks.run(self.api.revalidate_site, done)


class _Dialog(ctk.CTkToplevel):
    def __init__(self, view: StockView, title: str):
        super().__init__(view)
        self.view = view
        self.title(title)
        self.configure(fg_color="#0b0a0f")
        self.transient(view.winfo_toplevel())
        self.after(50, self.grab_set)
        self.body = ctk.CTkFrame(self, fg_color="transparent")
        self.body.pack(fill="both", expand=True, padx=20, pady=16)


class PurchaseDialog(_Dialog):
    """Compra a un proveedor: costo por unidad y cuántas entraron de cada color y talle."""

    def __init__(self, view: StockView, stock: ProductStock):
        super().__init__(view, f"Cargar compra · {stock.product['name']}")
        self.stock = stock
        b = self.body
        ctk.CTkLabel(b, text="Cargar compra", font=ctk.CTkFont(size=20, weight="bold")).pack(anchor="w")
        hint(b, f"{stock.product['name']} · se publica a {format_price(stock.product['price'])}").pack(anchor="w")

        row = ctk.CTkFrame(b, fg_color="transparent")
        row.pack(fill="x", pady=(12, 4))
        ctk.CTkLabel(row, text="Fecha").grid(row=0, column=0, sticky="w")
        self.date = DateTimeEntry(row)
        self.date.set(datetime.now(AR_TZ))
        self.date.grid(row=1, column=0, sticky="w", padx=(0, 16))
        ctk.CTkLabel(row, text="Costo por unidad ($)").grid(row=0, column=1, sticky="w")
        self.cost = ctk.CTkEntry(row, width=130, placeholder_text="ej. 10000")
        if stock.avg_cost is not None:
            self.cost.insert(0, str(round(stock.avg_cost)))
        self.cost.bind("<KeyRelease>", lambda _e: self._summary())
        self.cost.grid(row=1, column=1, sticky="w", padx=(0, 16))
        ctk.CTkLabel(row, text="Proveedor / nota").grid(row=0, column=2, sticky="w")
        self.note = ctk.CTkEntry(row, width=240, placeholder_text="opcional")
        self.note.grid(row=1, column=2, sticky="w")

        section_title(b, "Unidades que entraron").pack(anchor="w", pady=(14, 6))
        self.grid_ = VariantGrid(b, stock.product, editable=True, on_change=self._summary)
        self.grid_.pack(anchor="w")
        hint(b, "Dejá vacío lo que no compraste. Si el costo incluye envío del proveedor, sumalo por unidad.").pack(anchor="w", pady=(4, 0))
        self.summary = ctk.CTkLabel(b, text="", text_color=ACCENT, anchor="w", justify="left")
        self.summary.pack(anchor="w", pady=(10, 0))

        bar = ctk.CTkFrame(b, fg_color="transparent")
        bar.pack(fill="x", pady=(14, 0))
        primary_button(bar, "Guardar compra", self.save, width=150).pack(side="right")
        ghost_button(bar, "Cancelar", self.destroy, width=100).pack(side="right", padx=8)
        self._summary()

    def _summary(self):
        try:
            units = sum(self.grid_.read().values())
            cost = parse_int(self.cost.get(), "El costo", allow_empty=True) or 0
        except ValueError:
            self.summary.configure(text="")
            return
        if not units:
            self.summary.configure(text="")
            return
        text = f"{units} unidades · total {format_price(units * cost)}"
        price = self.stock.product["price"]
        if cost:
            text += f"\nA {format_price(price)} ganás {format_price(price - cost)} por unidad " \
                    f"({(price - cost) / price * 100:.0f} % del precio)".replace(".", ",")
        self.summary.configure(text=text)

    def save(self):
        try:
            when = self.date.get("La fecha")
            cost = parse_int(self.cost.get(), "El costo por unidad")
            quantities = {k: v for k, v in self.grid_.read().items() if v > 0}
            if not quantities:
                raise ValueError("Cargá al menos una unidad.")
        except ValueError as exc:
            messagebox.showwarning("Revisá la compra", str(exc), parent=self)
            return
        payload = {
            "happened_at": when.isoformat(), "product_id": self.stock.product["id"], "unit_cost": cost,
            "note": self.note.get().strip(),
            "items": [{"color": k.split("|", 1)[0], "size": k.split("|", 1)[1], "quantity": v} for k, v in quantities.items()],
        }
        units = sum(quantities.values())

        def done(_):
            self.destroy()
            self.view.saved(f"Compra cargada: {units} u. de {self.stock.product['name']}")

        self.view.app.tasks.run(lambda: self.view.api.record_purchase(payload), done)


class AdjustDialog(_Dialog):
    """Conteo o corrección: ponés cuántas hay de verdad y se registra la diferencia con un motivo."""

    def __init__(self, view: StockView, stock: ProductStock):
        super().__init__(view, f"Ajustar stock · {stock.product['name']}")
        self.stock = stock
        b = self.body
        ctk.CTkLabel(b, text="Ajustar / contar", font=ctk.CTkFont(size=20, weight="bold")).pack(anchor="w")
        hint(b, "Corregí las cantidades a lo que tenés de verdad (rotura, pérdida, regalo, conteo). "
                "Se guarda la diferencia como ajuste. Para mercadería nueva usá “Cargar compra”, así se registra el costo.") \
            .pack(anchor="w", pady=(2, 10))
        current = {variant_key(c, s): stock.qty(c, s) for c, s in stock.variants()}
        self.current = current
        self.grid_ = VariantGrid(b, stock.product, current, editable=True)
        self.grid_.pack(anchor="w")
        ctk.CTkLabel(b, text="Motivo").pack(anchor="w", pady=(12, 2))
        self.note = ctk.CTkEntry(b, width=420, placeholder_text="ej. conteo de fin de mes, se manchó una, regalo a un sponsor")
        self.note.pack(anchor="w")
        bar = ctk.CTkFrame(b, fg_color="transparent")
        bar.pack(fill="x", pady=(14, 0))
        primary_button(bar, "Guardar ajuste", self.save, width=150).pack(side="right")
        ghost_button(bar, "Cancelar", self.destroy, width=100).pack(side="right", padx=8)

    def save(self):
        try:
            counted = self.grid_.read(allow_empty=False)
            note = self.note.get().strip()
            if not note:
                raise ValueError("Escribí el motivo del ajuste.")
        except ValueError as exc:
            messagebox.showwarning("Revisá el ajuste", str(exc), parent=self)
            return
        deltas = {k: counted[k] - self.current.get(k, 0) for k in counted if counted[k] != self.current.get(k, 0)}
        if not deltas:
            self.destroy()
            return
        payload = {"product_id": self.stock.product["id"], "note": note,
                   "items": [{"color": k.split("|", 1)[0], "size": k.split("|", 1)[1], "quantity": v} for k, v in deltas.items()]}

        def done(_):
            self.destroy()
            self.view.saved(f"Stock ajustado: {self.stock.product['name']}")

        self.view.app.tasks.run(lambda: self.view.api.adjust_stock(payload), done)
