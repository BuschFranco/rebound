"""Registrar una venta: desde un pedido de la web (precargado) o a mano (en persona, Instagram…)."""

from __future__ import annotations

from datetime import datetime
from tkinter import messagebox
from typing import Any, Callable

import customtkinter as ctk

from db import AR_TZ, parse_ts
from inventory import HEALTH, ProductStock, SaleLine, health, margin, sale_payload
from widgets import (ACCENT, DANGER, MUTED, SURFACE, DateTimeEntry, Tasks, clip, format_price, ghost_button, hint,
                     parse_int, primary_button, section_title)


class SaleDialog(ctk.CTkToplevel):
    def __init__(self, master, *, api, tasks: Tasks, stocks: dict[str, ProductStock],
                 on_done: Callable[[str], None], order: dict[str, Any] | None = None):
        super().__init__(master)
        self.api = api
        self.tasks = tasks
        self.stocks = stocks
        self.on_done = on_done
        self.order = order
        self.products = sorted((s.product for s in stocks.values()), key=lambda p: p["name"])
        self.by_name = {p["name"]: p for p in self.products}
        self.rows: list[dict[str, Any]] = []

        self.title("Registrar venta")
        self.configure(fg_color="#0b0a0f")
        self.geometry("900x640")
        self.transient(master.winfo_toplevel())
        self.after(50, self.grab_set)

        b = ctk.CTkFrame(self, fg_color="transparent")
        b.pack(fill="both", expand=True, padx=20, pady=16)
        title = "Confirmar venta del pedido" if order else "Venta manual"
        ctk.CTkLabel(b, text=title, font=ctk.CTkFont(size=20, weight="bold")).pack(anchor="w")
        if order:
            when = parse_ts(order["created_at"]).astimezone(AR_TZ).strftime("%d/%m %H:%M")
            hint(b, f"Pedido del {when} por {format_price(order['total'])}"
                    f"{' (con envío)' if order.get('shipping') else ''}. Si en el chat cambió algo (talle, color, "
                    "cantidad o precio), corregilo antes de confirmar.", ).pack(anchor="w")
        else:
            hint(b, "Para ventas por fuera de la web: en persona, Instagram, Mercado Libre…").pack(anchor="w")

        section_title(b, "Productos").pack(anchor="w", pady=(12, 4))
        self.lines_frame = ctk.CTkScrollableFrame(b, fg_color=SURFACE, corner_radius=10, height=230)
        self.lines_frame.pack(fill="x")
        ghost_button(b, "+ Agregar producto", lambda: self._add_row(), width=160).pack(anchor="w", pady=(6, 0))

        row = ctk.CTkFrame(b, fg_color="transparent")
        row.pack(fill="x", pady=(14, 0))
        ctk.CTkLabel(row, text="Cobrado por productos ($)").grid(row=0, column=0, sticky="w")
        self.revenue = ctk.CTkEntry(row, width=150)
        self.revenue.bind("<KeyRelease>", lambda _e: self._revenue_typed())
        self.revenue.grid(row=1, column=0, sticky="w", padx=(0, 16))
        ctk.CTkLabel(row, text="Fecha").grid(row=0, column=1, sticky="w")
        self.date = DateTimeEntry(row)
        self.date.set(datetime.now(AR_TZ))
        self.date.grid(row=1, column=1, sticky="w", padx=(0, 16))
        ctk.CTkLabel(row, text="Nota").grid(row=0, column=2, sticky="w")
        self.note = ctk.CTkEntry(row, width=220, placeholder_text="opcional")
        self.note.grid(row=1, column=2, sticky="w")
        hint(b, "Sin envío: lo que pagó el cliente por la ropa, con la promo ya descontada. "
                "Se reparte entre los productos según su precio.").pack(anchor="w", pady=(4, 0))
        self.auto_revenue = True

        self.summary = ctk.CTkLabel(b, text="", anchor="w", justify="left", font=ctk.CTkFont(size=13))
        self.summary.pack(anchor="w", pady=(10, 0))

        bar = ctk.CTkFrame(b, fg_color="transparent")
        bar.pack(fill="x", side="bottom", pady=(10, 0))
        primary_button(bar, "Confirmar venta", self.save, width=160).pack(side="right")
        ghost_button(bar, "Cancelar", self.destroy, width=100).pack(side="right", padx=8)

        if order:
            for item in order["items"]:
                self._add_row(item)
            if order.get("subtotal") is not None:
                self.revenue.delete(0, "end")
                self.revenue.insert(0, str(order["subtotal"] - (order.get("discount") or 0)))
                self.auto_revenue = False
        else:
            self._add_row()
        self._summary()

    def _revenue_typed(self):
        # Si lo escribís a mano, deja de seguir al precio de lista.
        self.auto_revenue = False
        self._summary()

    # ---------- Filas ----------
    def _add_row(self, item: dict[str, Any] | None = None):
        frame = ctk.CTkFrame(self.lines_frame, fg_color="transparent")
        frame.pack(fill="x", pady=3)
        names = [p["name"] for p in self.products]
        product = next((p for p in self.products if item and p["id"] == item.get("product_id")), None)
        row: dict[str, Any] = {"frame": frame, "missing": None}
        if item and product is None:
            # El producto ya no existe: se vende igual (para la ganancia) pero no mueve stock.
            row["missing"] = item
        product_menu = ctk.CTkOptionMenu(frame, values=names or ["—"], width=260,
                                         command=lambda _v: self._product_changed(row))
        product_menu.set(product["name"] if product else (item.get("name", "—") if item else (names[0] if names else "—")))
        product_menu.pack(side="left")
        color_menu = ctk.CTkOptionMenu(frame, values=["—"], width=120, command=lambda _v: self._summary())
        color_menu.pack(side="left", padx=6)
        size_menu = ctk.CTkOptionMenu(frame, values=["—"], width=90, command=lambda _v: self._summary())
        size_menu.pack(side="left")
        qty = ctk.CTkEntry(frame, width=50, justify="center")
        qty.insert(0, str(item.get("quantity", 1)) if item else "1")
        qty.bind("<KeyRelease>", lambda _e: self._summary())
        qty.pack(side="left", padx=6)
        ctk.CTkLabel(frame, text="u.", text_color=MUTED).pack(side="left")
        info = ctk.CTkLabel(frame, text="", text_color=MUTED, anchor="w", width=210)
        info.pack(side="left", padx=8)

        def remove():
            frame.destroy()
            self.rows.remove(row)
            self._summary()

        ctk.CTkButton(frame, text="✕", width=28, fg_color="transparent", text_color=DANGER, command=remove).pack(side="right")
        row.update(product=product_menu, color=color_menu, size=size_menu, qty=qty, info=info)
        self.rows.append(row)
        self._product_changed(row, item)

    def _product_changed(self, row: dict[str, Any], item: dict[str, Any] | None = None):
        p = self.by_name.get(row["product"].get())
        if p is None:
            row["color"].configure(values=[item.get("color", "—")] if item else ["—"])
            row["color"].set(item.get("color", "—") if item else "—")
            row["size"].configure(values=[item.get("size", "—")] if item else ["—"])
            row["size"].set(item.get("size", "—") if item else "—")
        else:
            row["missing"] = None
            colors = [c["name"] for c in p["colors"]]
            row["color"].configure(values=colors)
            row["color"].set(item["color"] if item and item.get("color") in colors else colors[0])
            row["size"].configure(values=p["sizes"])
            row["size"].set(item["size"] if item and item.get("size") in p["sizes"] else p["sizes"][0])
        self._summary()

    def _line(self, row: dict[str, Any], strict: bool) -> SaleLine | None:
        p = self.by_name.get(row["product"].get())
        try:
            qty = parse_int(row["qty"].get(), "La cantidad")
        except ValueError:
            if strict:
                raise
            qty = 0
        if p is None:
            m = row["missing"]
            if not m:
                return None
            return SaleLine(m.get("product_id", ""), m.get("name", "?"), m.get("color", ""), m.get("size", ""),
                            qty, int(m.get("price", 0)))
        s = self.stocks[p["id"]]
        return SaleLine(p["id"], p["name"], row["color"].get(), row["size"].get(), qty, p["price"],
                        unit_cost=round(s.avg_cost or 0))

    def _lines(self, strict: bool) -> list[SaleLine]:
        return [line for row in self.rows if (line := self._line(row, strict)) is not None]

    def _summary(self):
        lines = self._lines(strict=False)
        list_total = sum(l.list_price * l.quantity for l in lines)
        if self.auto_revenue:
            self.revenue.delete(0, "end")
            self.revenue.insert(0, str(list_total))
        for row in self.rows:
            line = self._line(row, strict=False)
            if line is None:
                continue
            s = self.stocks.get(line.product_id)
            if s is None:
                row["info"].configure(text="ya no está en el catálogo", text_color=MUTED)
            elif not s.tracked:
                row["info"].configure(text=f"{format_price(line.list_price)} c/u · sin control de stock", text_color=MUTED)
            else:
                have = s.qty(line.color, line.size)
                warn = have < line.quantity
                row["info"].configure(text=f"{format_price(line.list_price)} c/u · hay {have}" + (" ⚠ falta" if warn else ""),
                                      text_color=DANGER if warn else MUTED)
        try:
            revenue = parse_int(self.revenue.get(), "Lo cobrado", allow_empty=True) or 0
        except ValueError:
            revenue = 0
        cost = sum(l.unit_cost * l.quantity for l in lines)
        missing_cost = any(self.stocks.get(l.product_id) and self.stocks[l.product_id].avg_cost is None for l in lines)
        text = f"Precio de lista {format_price(list_total)}"
        if revenue and list_total and revenue != list_total:
            text += f" · descuento {format_price(list_total - revenue)}"
        if revenue:
            m = margin(revenue, cost)
            label, color = HEALTH[health(None if missing_cost else m)]
            text += f"\nCosto {format_price(cost)} · ganancia {format_price(revenue - cost)} ({m * 100:.0f} %) · {label}"
            if missing_cost:
                text += "\nAlgún producto no tiene compras cargadas: su costo cuenta como $0."
            self.summary.configure(text=text, text_color=color if not missing_cost else ACCENT)
        else:
            self.summary.configure(text=text, text_color=MUTED)

    # ---------- Guardar ----------
    def save(self):
        try:
            lines = [l for l in self._lines(strict=True) if l.quantity > 0]
            if not lines:
                raise ValueError("Agregá al menos un producto.")
            revenue = parse_int(self.revenue.get(), "Lo cobrado por productos")
            when = self.date.get("La fecha")
        except ValueError as exc:
            messagebox.showwarning("Revisá la venta", str(exc), parent=self)
            return
        short = [l for l in lines if (s := self.stocks.get(l.product_id)) and s.tracked and s.qty(l.color, l.size) < l.quantity]
        if short:
            detail = "\n".join(f"• {clip(l.name, 30)} {l.color} {l.size}" for l in short)
            if not messagebox.askyesno("Falta stock", f"Según el panel no alcanza el stock de:\n{detail}\n\n"
                                       "¿Confirmás igual? Esas variantes quedan en negativo para que las revises.",
                                       parent=self):
                return
        payload = sale_payload(lines, revenue, source="web" if self.order else "manual", sold_at=when,
                               order_intent_id=self.order["id"] if self.order else None, note=self.note.get().strip())

        def done(_):
            self.destroy()
            self.on_done(f"Venta registrada: {format_price(revenue)}")

        self.tasks.run(lambda: self.api.record_sale(payload), done)
