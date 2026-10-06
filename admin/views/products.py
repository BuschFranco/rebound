"""Productos: precio, oferta, imágenes, talles, colores, beneficios, visibilidad y fecha de publicación."""

from __future__ import annotations

import webbrowser
from datetime import datetime
from tkinter import messagebox
from typing import Any

import customtkinter as ctk

from db import AR_TZ, SLUG_RE, parse_ts, slugify
from widgets import (ACCENT, MUTED, OK, ColorList, DateTimeEntry, ImageStrip, format_price, get_text, ghost_button,
                     parse_int, set_entry)

from .base import EditorView
from .price_adjust import PriceAdjustDialog

ALL = "Todas las categorías"
# Mismo plazo que NEW_PRODUCT_DAYS en src/data/business.ts.
NEW_PRODUCT_DAYS = 45


class ProductsView(EditorView):
    noun = "producto"
    table = "products"
    list_thumbs = True
    list_placeholder = "Buscar por nombre o slug…"

    def __init__(self, master, app):
        self.categories: list[dict[str, Any]] = []
        self.slug_touched = False
        super().__init__(master, app)

    # ---------- Lista ----------
    def build_list_extra(self, box):
        self.filter_category = ctk.CTkOptionMenu(box, values=[ALL], command=lambda _v: self._refresh_list())
        self.filter_category.pack(fill="x", pady=(0, 4))
        self.show_hidden = ctk.CTkCheckBox(box, text="Mostrar ocultos", command=self._refresh_list)
        self.show_hidden.select()
        self.show_hidden.pack(anchor="w", pady=(0, 6))
        ghost_button(box, "% Ajustar precios…", self.open_price_adjust).pack(fill="x", pady=(0, 6))
        # Aparece solo después de un ajuste masivo, hasta deshacerlo o cerrar el panel.
        self.undo_button = ghost_button(box, "", self.undo_price_adjust)
        self.undo_button.configure(border_color=ACCENT, text_color=ACCENT)
        self.last_adjust: list[dict[str, Any]] = []

    def open_price_adjust(self):
        if not self.records:
            return
        PriceAdjustDialog(self.app, self.records, self.categories, on_done=self.load,
                          on_applied=self._remember_adjust)

    def _remember_adjust(self, originals: list[dict[str, Any]]):
        self.last_adjust = originals
        self.undo_button.configure(text=f"↶ Deshacer ajuste ({len(originals)} productos)")
        self.undo_button.pack(fill="x", pady=(0, 6))

    def undo_price_adjust(self):
        originals = self.last_adjust
        if not originals or not messagebox.askyesno(
                "Deshacer ajuste", f"¿Volver {len(originals)} producto(s) a los precios de antes del ajuste?"):
            return
        self.undo_button.configure(state="disabled", text="Deshaciendo…")

        def work():
            for o in originals:
                self.api.update("products", {"id": o["id"]},
                                {"price": o["price"], "compare_at_price": o["compare_at_price"]})
            return self.api.revalidate_site()

        def done(revalidated):
            self.last_adjust = []
            self.undo_button.configure(state="normal")
            self.undo_button.pack_forget()
            self.app.changed(None, f"Ajuste deshecho ({len(originals)} productos)", revalidated)
            self.load()

        def fail(exc):
            self.undo_button.configure(state="normal", text=f"↶ Deshacer ajuste ({len(originals)} productos)")
            messagebox.showerror("No se pudo deshacer", f"{exc}\n\nAlgunos precios pueden haber vuelto: revisá la lista.")
            self.load()

        self.app.tasks.run(work, done, fail)

    # ---------- Duplicar / ver en el sitio ----------
    def build_extra_buttons(self, bar):
        self.duplicate_button = ghost_button(bar, "⧉ Duplicar", self.duplicate, width=110)
        self.duplicate_button.pack(side="left", padx=(12, 4))
        self.view_button = ghost_button(bar, "↗ Ver en el sitio", self.open_in_site, width=140)
        self.view_button.pack(side="left")

    def _sync_record_buttons(self):
        state = "normal" if self.current else "disabled"
        self.duplicate_button.configure(state=state)
        self.view_button.configure(state=state)

    def select(self, key):
        super().select(key)
        self._sync_record_buttons()

    def new(self):
        super().new()
        self._sync_record_buttons()

    def duplicate(self):
        """Arma un producto nuevo a partir del actual (mismos datos y fotos). Se crea recién al guardar."""
        if not self.current:
            return
        copy = {**self.current, "name": f"{self.current['name']} (copia)",
                "slug": f"{self.current['slug']}-copia", "published_at": None}
        self.new()
        self.heading.configure(text="Nuevo producto (copia)")
        self.fill(copy)
        self.app.status("Copia lista: cambiá lo que haga falta y tocá Guardar para crearla.", "warn")

    def open_in_site(self):
        if not self.current:
            return
        base = self.api.config.site_url or "http://localhost:3000"
        webbrowser.open(f"{base}/producto/{self.current['slug']}/")

    def _label_of(self, slug: str) -> str:
        return next((c["label"] for c in self.categories if c["slug"] == slug), slug)

    def _refresh_list(self):
        self.list.set_items(self.to_items(self.records))

    def to_items(self, records):
        chosen = self.filter_category.get()
        items = []
        for p in records:
            if chosen != ALL and self._label_of(p["category_slug"]) != chosen:
                continue
            if not p["active"] and not self.show_hidden.get():
                continue
            flags = []
            if not p["active"]:
                flags.append("OCULTO")
            if p.get("compare_at_price"):
                off = round((1 - p["price"] / p["compare_at_price"]) * 100)
                flags.append(f"-{off}%")
            items.append({
                "id": p["id"],
                "title": p["name"],
                "subtitle": f"{self._label_of(p['category_slug'])} · {format_price(p['price'])}"
                            + (f" · {' · '.join(flags)}" if flags else ""),
                "search": f"{p['name']} {p['slug']}",
                "image": p["images"][0] if p["images"] else None,
                "dim": not p["active"],
            })
        return items

    def set_categories(self, categories: list[dict[str, Any]]):
        self.categories = categories
        labels = [c["label"] for c in categories]
        self.filter_category.configure(values=[ALL, *labels])
        if self.filter_category.get() not in (ALL, *labels):
            self.filter_category.set(ALL)
        self.category.configure(values=labels or ["(creá una categoría primero)"])
        if self.category.get() not in labels:
            self.category.set(labels[0] if labels else "(creá una categoría primero)")

    def fetch(self):
        return self.api.products()

    def title_of(self, record):
        return record["name"]

    # ---------- Formulario ----------
    def build_form(self, f):
        f.title("Datos")
        self.name = f.add("Nombre", ctk.CTkEntry(f, width=420))
        self.name.bind("<KeyRelease>", self._auto_slug)
        self.slug = f.add("Slug (URL)", ctk.CTkEntry(f, width=420),
                          "Se arma solo con el nombre. Va en la dirección: /producto/<slug>/")
        self.slug.bind("<KeyRelease>", lambda _e: setattr(self, "slug_touched", True))
        self.category = f.add("Categoría", ctk.CTkOptionMenu(f, values=["…"], width=240))
        self.description = f.add("Descripción", ctk.CTkTextbox(f, width=520, height=90, wrap="word"))

        f.title("Precio y oferta")
        self.price = f.add("Precio", ctk.CTkEntry(f, width=160, placeholder_text="ej. 42999"),
                           "En pesos, final (IVA incluido), sin decimales.")
        self.price.bind("<KeyRelease>", lambda _e: self._update_discount())
        offer_row = ctk.CTkFrame(f, fg_color="transparent")
        self.on_sale = ctk.CTkCheckBox(offer_row, text="En oferta", command=self._toggle_offer)
        self.on_sale.pack(side="left")
        self.compare = ctk.CTkEntry(offer_row, width=160, placeholder_text="Precio anterior")
        self.compare.pack(side="left", padx=10)
        self.compare.bind("<KeyRelease>", lambda _e: self._update_discount())
        self.discount = ctk.CTkLabel(offer_row, text="", text_color=ACCENT, font=ctk.CTkFont(weight="bold"))
        self.discount.pack(side="left")
        f.add("Oferta", offer_row, "El sitio muestra el precio anterior tachado y la etiqueta “-X%”; "
                                   "el producto aparece en /ofertas.")

        f.title("Imágenes")
        self.images = f.full(ImageStrip(f, self.app.thumbs), sticky="w")

        f.title("Variantes")
        self.sizes = f.add("Talles", ctk.CTkEntry(f, width=420, placeholder_text="S, M, L, XL"),
                           "Separados por coma, en el orden en que se muestran.")
        self.sizes.bind("<KeyRelease>", lambda _e: self._render_sold_out())
        self.sold_out_box = f.add("Agotados", ctk.CTkFrame(f, fg_color="transparent"),
                                  "Marcá los talles sin stock: se ven tachados en la tienda y no se pueden pedir.",
                                  sticky="ew")
        self.sold_out: set[str] = set()
        self.colors = f.add("Colores", ColorList(f), "Tocá el cuadrado para elegir el color.", sticky="ew")

        f.title("Beneficios (los 3 puntos de la ficha)")
        self.highlights = [f.add(f"Beneficio {i + 1}", ctk.CTkEntry(f, width=520)) for i in range(3)]

        f.title("Publicación")
        self.active = f.add("Visible en la tienda", ctk.CTkSwitch(f, text="", progress_color=OK),
                            "Apagado = oculto: no se ve ni se puede comprar, pero no se borra.")
        self.published = f.add("Publicado el", DateTimeEntry(f),
                               f"Se muestra como “Nuevo” durante {NEW_PRODUCT_DAYS} días desde esta fecha "
                               "y ordena “Drop nuevo” y “Más nuevos”.")
        self.sort_order = f.add("Orden", ctk.CTkEntry(f, width=100), "Orden en “Relevancia” (menor = primero).")

    def _current_sizes(self) -> list[str]:
        return [s.strip() for s in self.sizes.get().split(",") if s.strip()]

    def _render_sold_out(self):
        """Una casilla por talle; se rearma al cambiar la lista de talles."""
        for child in self.sold_out_box.winfo_children():
            child.destroy()
        sizes = self._current_sizes()
        if not sizes:
            ctk.CTkLabel(self.sold_out_box, text="Primero cargá los talles.", text_color=MUTED).pack(anchor="w")
            return
        for i, size in enumerate(sizes):
            box = ctk.CTkCheckBox(self.sold_out_box, text=size, width=70,
                                  command=lambda s=size: self._toggle_sold_out(s))
            if size in self.sold_out:
                box.select()
            box.grid(row=i // 8, column=i % 8, sticky="w", padx=(0, 8), pady=2)

    def _toggle_sold_out(self, size: str):
        self.sold_out ^= {size}

    def _auto_slug(self, _event=None):
        if not self.slug_touched:
            set_entry(self.slug, slugify(self.name.get()))

    def _toggle_offer(self):
        self.compare.configure(state="normal" if self.on_sale.get() else "disabled")
        self._update_discount()

    def _update_discount(self):
        try:
            price = parse_int(self.price.get(), "precio")
            before = parse_int(self.compare.get(), "precio anterior")
        except ValueError:
            self.discount.configure(text="")
            return
        if self.on_sale.get() and price and before and before > price:
            self.discount.configure(text=f"-{round((1 - price / before) * 100)}%", text_color=ACCENT)
        elif self.on_sale.get():
            self.discount.configure(text="tiene que ser mayor al precio", text_color=MUTED)
        else:
            self.discount.configure(text="")

    def fill(self, p):
        p = p or {}
        set_entry(self.name, p.get("name", ""))
        set_entry(self.slug, p.get("slug", ""))
        self.slug_touched = bool(p)  # al editar, el slug no cambia solo (rompería links compartidos)
        if p:
            self.category.set(self._label_of(p["category_slug"]))
        set_entry(self.description, p.get("description", ""))
        set_entry(self.price, p.get("price", ""))
        compare = p.get("compare_at_price")
        self.compare.configure(state="normal")
        set_entry(self.compare, compare or "")
        if compare:
            self.on_sale.select()
        else:
            self.on_sale.deselect()
        self._toggle_offer()
        self.images.set(p.get("images", []))
        set_entry(self.sizes, ", ".join(p.get("sizes", [])) if p else "S, M, L, XL")
        self.sold_out = set(p.get("sold_out_sizes", []))
        self._render_sold_out()
        self.colors.set(p.get("colors", []) if p else [{"name": "Negro", "hex": "#111111"}])
        highlights = p.get("highlights", [])
        for i, entry in enumerate(self.highlights):
            set_entry(entry, highlights[i] if i < len(highlights) else "")
        if p.get("active", True):
            self.active.select()
        else:
            self.active.deselect()
        self.published.set(parse_ts(p.get("published_at")) or datetime.now(AR_TZ))
        set_entry(self.sort_order, p.get("sort_order", 0))

    def collect(self):
        name = self.name.get().strip()
        if not name:
            raise ValueError("Completá el nombre.")
        slug = self.slug.get().strip() or slugify(name)
        if not SLUG_RE.match(slug):
            raise ValueError("El slug solo puede tener minúsculas, números y guiones (ej. jersey-rebound-07).")
        category = next((c["slug"] for c in self.categories if c["label"] == self.category.get()), None)
        if not category:
            raise ValueError("Elegí una categoría (si no hay, creá una en la pestaña Categorías).")
        price = parse_int(self.price.get(), "el precio")
        if price <= 0:
            raise ValueError("El precio tiene que ser mayor a 0.")
        compare = None
        if self.on_sale.get():
            compare = parse_int(self.compare.get(), "el precio anterior")
            if compare <= price:
                raise ValueError("Para que sea oferta, el precio anterior tiene que ser mayor al precio actual.")
        images = self.images.get()
        if not images:
            raise ValueError("Agregá al menos una imagen.")
        sizes = [s.strip() for s in self.sizes.get().split(",") if s.strip()]
        if not sizes:
            raise ValueError("Agregá al menos un talle (ej. Único).")
        colors = self.colors.get()
        if not colors:
            raise ValueError("Agregá al menos un color con nombre.")
        return {
            "name": name, "slug": slug, "category_slug": category,
            "description": get_text(self.description),
            "price": price, "compare_at_price": compare,
            "images": images, "sizes": sizes, "colors": colors,
            "sold_out_sizes": [s for s in sizes if s in self.sold_out],
            "highlights": [e.get().strip() for e in self.highlights if e.get().strip()],
            "active": bool(self.active.get()),
            "published_at": self.published.get("Publicado el").isoformat(),
            "sort_order": parse_int(self.sort_order.get() or "0", "el orden"),
        }

    def persist(self, values):
        # Las fotos nuevas (archivos locales) se suben recién ahora.
        values["images"] = [src if src.startswith("http") else self.api.upload_image(src, "products", values["slug"])
                            for src in values["images"]]
        if self.current:
            old_images = self.current["images"]
            self.api.update("products", {"id": self.current["id"]}, values)
            self.api.delete_unused_images(set(old_images) - set(values["images"]))
            return self.current["id"]
        return self.api.insert("products", values)[0]["id"]

    # ---------- Eliminar u ocultar ----------
    def ask_delete(self):
        record = self.current
        if record is None:
            return
        answer = messagebox.askyesnocancel(
            "Eliminar producto",
            f"“{record['name']}”\n\n¿Preferís OCULTARLO? Deja de verse en la tienda pero podés volver a mostrarlo.\n\n"
            "Sí = ocultar   ·   No = eliminar definitivamente (también sus fotos subidas)   ·   Cancelar",
            icon="warning",
        )
        if answer is None:
            return
        if answer:
            def hide():
                self.api.update("products", {"id": record["id"]}, {"active": False})
                return self.api.revalidate_site()

            self.app.tasks.run(hide, lambda ok: (self.app.changed(self, "Producto oculto", ok), self.load(select=record["id"])))
            return

        def delete():
            self.api.delete("products", {"id": record["id"]})
            self.api.delete_unused_images(record["images"])
            return self.api.revalidate_site()

        def done(ok):
            self.app.changed(self, "Producto eliminado", ok)
            self.current = None
            self.load()
            self.new()

        self.app.tasks.run(delete, done)
