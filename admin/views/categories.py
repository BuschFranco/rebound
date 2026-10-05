"""Categorías: nombre, portada, orden, guía de talles y sugerencias de "Completá el look"."""

from __future__ import annotations

from tkinter import messagebox
from typing import Any

import customtkinter as ctk

from db import SLUG_RE, slugify
from widgets import ImageStrip, ghost_button, hint, set_entry

from .base import EditorView

SIZE_GUIDES = {"Ropa (altura y peso)": "apparel", "Calzado (largo del pie)": "shoes", "Sin guía": "none"}


class CategoriesView(EditorView):
    noun = "categoría"
    feminine = True
    key = "slug"
    table = "categories"
    list_thumbs = True
    list_placeholder = "Buscar categoría…"

    def __init__(self, master, app):
        self.slug_touched = False
        self.complement_vars: dict[str, ctk.StringVar] = {}
        super().__init__(master, app)

    def fetch(self):
        return self.api.categories()

    def title_of(self, record):
        return record["label"]

    def to_items(self, records):
        return [{
            "id": c["slug"], "title": c["label"],
            "subtitle": f"#{i + 1} en el orden · {c['slug']}",
            "search": f"{c['label']} {c['slug']}", "image": c["image_url"],
        } for i, c in enumerate(records)]

    def build_extra_buttons(self, bar):
        ghost_button(bar, "▲ Subir", lambda: self.move(-1), width=90).pack(side="left", padx=(12, 4))
        ghost_button(bar, "▼ Bajar", lambda: self.move(1), width=90).pack(side="left")

    # ---------- Formulario ----------
    def build_form(self, f):
        f.title("Datos")
        self.label = f.add("Nombre", ctk.CTkEntry(f, width=320))
        self.label.bind("<KeyRelease>", self._auto_slug)
        self.slug = f.add("Slug (URL)", ctk.CTkEntry(f, width=320),
                          "Va en los links del catálogo (?categoria=<slug>). Si lo cambiás, sus productos lo siguen.")
        self.slug.bind("<KeyRelease>", lambda _e: setattr(self, "slug_touched", True))

        f.title("Portada")
        self.image = f.full(ImageStrip(f, self.app.thumbs, single=True, size=150), sticky="w")
        f.full(hint(f, "Se ve en las categorías de la home y en el menú Catálogo. Ideal: vertical (3:4)."))

        f.title("Reglas")
        self.size_guide = f.add("Guía de talles", ctk.CTkSegmentedButton(f, values=list(SIZE_GUIDES)),
                                "Qué tabla de talles muestra la ficha de sus productos.")
        self.complements_box = f.add("Completá el look", ctk.CTkFrame(f, fg_color="transparent"),
                                     "Qué categorías se sugieren en el carrito cuando hay un producto de esta.",
                                     sticky="ew")

    def _auto_slug(self, _event=None):
        if not self.slug_touched:
            set_entry(self.slug, slugify(self.label.get()))

    def _render_complements(self, own_slug: str | None, selected: list[str]):
        for child in self.complements_box.winfo_children():
            child.destroy()
        self.complement_vars = {}
        others = [c for c in self.records if c["slug"] != own_slug]
        if not others:
            hint(self.complements_box, "Todavía no hay otras categorías.").pack(anchor="w")
        for i, c in enumerate(others):
            var = ctk.StringVar(value=c["slug"] if c["slug"] in selected else "")
            ctk.CTkCheckBox(self.complements_box, text=c["label"], variable=var, onvalue=c["slug"], offvalue="") \
                .grid(row=i // 3, column=i % 3, sticky="w", padx=(0, 16), pady=3)
            self.complement_vars[c["slug"]] = var

    def fill(self, c):
        c = c or {}
        set_entry(self.label, c.get("label", ""))
        set_entry(self.slug, c.get("slug", ""))
        self.slug_touched = bool(c)
        self.image.set([c["image_url"]] if c.get("image_url") else [])
        guide = c.get("size_guide", "apparel")
        self.size_guide.set(next(k for k, v in SIZE_GUIDES.items() if v == guide))
        self._render_complements(c.get("slug"), c.get("complements", []))

    def collect(self):
        label = self.label.get().strip()
        if not label:
            raise ValueError("Completá el nombre.")
        slug = self.slug.get().strip() or slugify(label)
        if not SLUG_RE.match(slug):
            raise ValueError("El slug solo puede tener minúsculas, números y guiones (ej. camisetas).")
        image = self.image.get()
        if not image:
            raise ValueError("Elegí una foto de portada.")
        # Mantener el orden de las categorías en las sugerencias.
        complements = [s for s, var in self.complement_vars.items() if var.get()]
        values = {"label": label, "slug": slug, "image_url": image[0],
                  "size_guide": SIZE_GUIDES[self.size_guide.get()], "complements": complements}
        if not self.current:
            values["sort_order"] = max((r["sort_order"] for r in self.records), default=0) + 1
        return values

    def persist(self, values):
        if not values["image_url"].startswith("http"):
            values["image_url"] = self.api.upload_image(values["image_url"], "categories", values["slug"])
        if not self.current:
            self.api.insert("categories", values)
            return values["slug"]
        old = self.current
        # Cambiar el slug actualiza los productos solos (on update cascade).
        self.api.update("categories", {"slug": old["slug"]}, values)
        if values["slug"] != old["slug"]:
            self._replace_in_complements(old["slug"], values["slug"])
        if old["image_url"] != values["image_url"]:
            self.api.delete_unused_images([old["image_url"]])
        return values["slug"]

    def _replace_in_complements(self, old: str, new: str | None):
        """Actualiza (o quita) un slug en las sugerencias de las demás categorías."""
        for c in self.api.categories():
            if old in c["complements"]:
                updated = [new if s == old else s for s in c["complements"] if new or s != old]
                self.api.update("categories", {"slug": c["slug"]}, {"complements": updated})

    # ---------- Eliminar ----------
    def check_delete(self, record):
        count = self.api.count_products_in(record["slug"])
        if count:
            return (f"“{record['label']}” tiene {count} producto{'s' if count != 1 else ''} (contando los ocultos).\n\n"
                    "Mové esos productos a otra categoría o eliminalos primero.")
        return None

    def remove(self, record):
        self.api.delete("categories", {"slug": record["slug"]})
        self._replace_in_complements(record["slug"], None)
        self.api.delete_unused_images([record["image_url"]])

    # ---------- Orden ----------
    def move(self, step: int):
        if not self.current:
            return
        ordered = list(self.records)
        index = next(i for i, r in enumerate(ordered) if r["slug"] == self.current["slug"])
        j = index + step
        if not 0 <= j < len(ordered):
            return
        ordered[index], ordered[j] = ordered[j], ordered[index]
        changes = [(r["slug"], i + 1) for i, r in enumerate(ordered) if r["sort_order"] != i + 1]
        slug = self.current["slug"]

        def work():
            for s, order in changes:
                self.api.update("categories", {"slug": s}, {"sort_order": order})
            return self.api.revalidate_site()

        def done(ok):
            self.app.changed(self, "Orden de categorías actualizado", ok)
            self.load(select=slug)

        self.app.tasks.run(work, done)

    def confirm_delete(self, record):
        return messagebox.askyesno("Eliminar", f"¿Eliminar la categoría “{record['label']}”?\n"
                                               "También se quita de las sugerencias de las demás.", icon="warning")
