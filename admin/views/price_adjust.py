"""Ajuste masivo de precios por porcentaje (pensado para las actualizaciones por inflación)."""

from __future__ import annotations

import math
from tkinter import messagebox
from typing import TYPE_CHECKING, Any, Callable

import customtkinter as ctk

from widgets import ACCENT, MUTED, SURFACE, format_price, ghost_button, hint, primary_button

if TYPE_CHECKING:
    from app import AdminApp

ALL = "Todas las categorías"
ROUNDING = ("Exacto", "A la centena", "Terminado en 999")


def round_price(value: float, mode: str, going_up: bool) -> int:
    """Redondea hacia arriba si el precio sube y hacia abajo si baja (así nunca queda corto del %)."""
    step = math.ceil if going_up else math.floor
    if mode == "A la centena":
        return max(100, int(step(value / 100)) * 100)
    if mode == "Terminado en 999":
        return max(999, int(step((value + 1) / 1000)) * 1000 - 1)
    return max(1, round(value))


def plan_changes(products: list[dict[str, Any]], category: str | None, percent: float, mode: str) -> list[dict[str, Any]]:
    """Calcula los precios nuevos. El precio anterior de las ofertas sube igual, para mantener el descuento."""
    factor = 1 + percent / 100
    going_up = percent >= 0
    changes = []
    for p in products:
        if category and p["category_slug"] != category:
            continue
        price = round_price(p["price"] * factor, mode, going_up)
        compare = p.get("compare_at_price")
        new_compare = round_price(compare * factor, mode, going_up) if compare else None
        offer_lost = bool(compare) and (new_compare is None or new_compare <= price)
        if offer_lost:
            new_compare = None
        if price == p["price"] and new_compare == compare:
            continue
        changes.append({"product": p, "price": price, "compare_at_price": new_compare, "offer_lost": offer_lost})
    return changes


class PriceAdjustDialog(ctk.CTkToplevel):
    def __init__(self, app: "AdminApp", products: list[dict[str, Any]], categories: list[dict[str, Any]],
                 on_done: Callable[[], None], on_applied: Callable[[list[dict[str, Any]]], None] | None = None):
        super().__init__(app)
        self.app = app
        self.products = products
        self.categories = categories
        self.on_done = on_done
        self.on_applied = on_applied
        self.changes: list[dict[str, Any]] = []

        self.title("Ajustar precios")
        self.geometry("780x620")
        self.configure(fg_color="#0b0a0f")
        self.transient(app)
        self.after(100, self.grab_set)  # modal (después de que la ventana exista)

        ctk.CTkLabel(self, text="Ajustar precios", font=ctk.CTkFont(size=22, weight="bold")).pack(anchor="w", padx=20, pady=(18, 2))
        hint(self, "Sube (o baja, con un % negativo) el precio de todos los productos de una categoría, "
                   "incluidos los ocultos. En las ofertas también ajusta el precio anterior, así el “-X%” se mantiene.") \
            .pack(anchor="w", padx=20)

        form = ctk.CTkFrame(self, fg_color=SURFACE, corner_radius=10)
        form.pack(fill="x", padx=20, pady=12)
        form.grid_columnconfigure(1, weight=1)
        ctk.CTkLabel(form, text="Categoría").grid(row=0, column=0, sticky="w", padx=14, pady=(14, 6))
        self.category = ctk.CTkOptionMenu(form, values=[ALL, *[c["label"] for c in categories]], width=240,
                                          command=lambda _v: self.preview())
        self.category.grid(row=0, column=1, sticky="w", pady=(14, 6))
        ctk.CTkLabel(form, text="Porcentaje").grid(row=1, column=0, sticky="w", padx=14, pady=6)
        row = ctk.CTkFrame(form, fg_color="transparent")
        row.grid(row=1, column=1, sticky="w", pady=6)
        self.percent = ctk.CTkEntry(row, width=90, placeholder_text="ej. 10")
        self.percent.pack(side="left")
        self.percent.bind("<KeyRelease>", lambda _e: self.preview())
        ctk.CTkLabel(row, text="%   (negativo para bajar)", text_color=MUTED).pack(side="left", padx=6)
        ctk.CTkLabel(form, text="Redondeo").grid(row=2, column=0, sticky="w", padx=14, pady=(6, 14))
        self.rounding = ctk.CTkSegmentedButton(form, values=list(ROUNDING), command=lambda _v: self.preview())
        self.rounding.set("Terminado en 999")
        self.rounding.grid(row=2, column=1, sticky="w", pady=(6, 14))

        self.summary = ctk.CTkLabel(self, text="Escribí un porcentaje para ver los cambios.", text_color=MUTED, anchor="w")
        self.summary.pack(fill="x", padx=20)
        self.preview_box = ctk.CTkTextbox(self, height=280, wrap="none", font=ctk.CTkFont(family="Consolas", size=12))
        self.preview_box.pack(fill="both", expand=True, padx=20, pady=(6, 10))
        self.preview_box.configure(state="disabled")

        bar = ctk.CTkFrame(self, fg_color="transparent")
        bar.pack(fill="x", padx=20, pady=(0, 18))
        self.apply_button = primary_button(bar, "Aplicar", self.apply, width=200, state="disabled")
        self.apply_button.pack(side="right")
        ghost_button(bar, "Cancelar", self.destroy, width=110).pack(side="right", padx=8)
        self.percent.focus()

    def _category_slug(self) -> str | None:
        label = self.category.get()
        return next((c["slug"] for c in self.categories if c["label"] == label), None)

    def preview(self):
        text = self.percent.get().strip().replace(",", ".").replace("%", "")
        try:
            percent = float(text)
        except ValueError:
            percent = None
        self.preview_box.configure(state="normal")
        self.preview_box.delete("1.0", "end")
        if percent is None or percent == 0 or percent <= -90:
            self.changes = []
            self.summary.configure(text="Escribí un porcentaje (ej. 10 para subir 10 %, -5 para bajar 5 %).", text_color=MUTED)
        else:
            self.changes = plan_changes(self.products, self._category_slug(), percent, self.rounding.get())
            for c in self.changes:
                p = c["product"]
                line = f"{p['name'][:30]:<31}{format_price(p['price']):>11}  →  {format_price(c['price']):>11}"
                if p.get("compare_at_price"):
                    line += "   (se quita la oferta)" if c["offer_lost"] else \
                        f"   antes {format_price(p['compare_at_price'])} → {format_price(c['compare_at_price'])}"
                self.preview_box.insert("end", line + "\n")
            self.summary.configure(text=f"{len(self.changes)} producto(s) cambian de precio.", text_color=ACCENT)
        self.preview_box.configure(state="disabled")
        n = len(self.changes)
        self.apply_button.configure(state="normal" if n else "disabled",
                                    text=f"Aplicar a {n} producto{'s' if n != 1 else ''}" if n else "Aplicar")

    def apply(self):
        if not self.changes:
            return
        lost = sum(c["offer_lost"] for c in self.changes)
        warning = f"\n\n{lost} oferta(s) se quitan porque el redondeo dejó el precio anterior igual o menor." if lost else ""
        if not messagebox.askyesno("Ajustar precios", f"¿Cambiar el precio de {len(self.changes)} producto(s)?{warning}",
                                   parent=self):
            return
        changes = self.changes
        # Precios exactos de antes, para poder deshacer (bajar el mismo % no los devuelve por el redondeo).
        originals = [{"id": c["product"]["id"], "name": c["product"]["name"], "price": c["product"]["price"],
                      "compare_at_price": c["product"].get("compare_at_price")} for c in changes]
        self.apply_button.configure(state="disabled", text="Aplicando…")

        def work():
            for c in changes:
                self.app.api.update("products", {"id": c["product"]["id"]},
                                    {"price": c["price"], "compare_at_price": c["compare_at_price"]})
            return self.app.api.revalidate_site()

        def done(revalidated):
            self.app.changed(None, f"Precios actualizados ({len(changes)} productos)", revalidated)
            if self.on_applied:
                self.on_applied(originals)
            self.on_done()
            self.destroy()

        def fail(exc):
            self.apply_button.configure(state="normal", text="Reintentar")
            messagebox.showerror("No se pudo completar",
                                 f"{exc}\n\nAlgunos precios pueden haberse actualizado: revisá la lista.", parent=self)
            self.on_done()

        self.app.tasks.run(work, done, fail)
