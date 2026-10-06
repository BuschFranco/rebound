"""Banners de la home que no dependen de una promo: por ahora, el de ofertas.

El banner de cada promo se edita dentro de la promo (pestaña Promociones).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import customtkinter as ctk

from widgets import BannerFields, Form, ghost_button, hint, primary_button, show_error

if TYPE_CHECKING:
    from app import AdminApp

# Los mismos textos automáticos que usa el sitio (src/lib/banners.ts).
OFFERS_DEFAULTS = {
    "eyebrow": "Ofertas de temporada",
    "title": "Hasta {descuento}% off",
    "text": "{cantidad} productos rebajados, con el precio anterior tachado. Pedilos por WhatsApp y pagá al recibir.",
    "cta": "Ver ofertas",
}


class BannersView(ctk.CTkFrame):
    def __init__(self, master, app: "AdminApp"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.api = app.api
        self.record: dict[str, Any] = {}

        ctk.CTkLabel(self, text="Banner de ofertas", font=ctk.CTkFont(size=22, weight="bold"), anchor="w").pack(fill="x")
        hint(self, "Se muestra en la home cuando hay productos con precio rebajado y lleva a /ofertas. "
                   "El banner de cada promo se edita dentro de la promo, en la pestaña Promociones.") \
            .pack(anchor="w", pady=(2, 8))

        form = Form(self)
        form.pack(fill="both", expand=True)
        form.title("Textos e imagen")
        self.fields = form.full(BannerFields(form, app.thumbs, "{descuento} (el mayor % de descuento), {cantidad} (productos rebajados)"),
                                sticky="ew")
        self.fields.set_placeholders(OFFERS_DEFAULTS)

        bar = ctk.CTkFrame(self, fg_color="transparent")
        bar.pack(fill="x", pady=(10, 0))
        self.save_button = primary_button(bar, "Guardar", self.save, width=140)
        self.save_button.pack(side="right")
        ghost_button(bar, "Volver a los textos automáticos", self.reset, width=240).pack(side="right", padx=8)

    def load(self):
        def done(record):
            self.record = record
            self.fields.set(record)
            self.fields.set_placeholders(OFFERS_DEFAULTS)

        self.app.tasks.run(self.api.offers_banner, done)

    def reset(self):
        self.fields.set({})
        self.fields.set_placeholders(OFFERS_DEFAULTS)

    def save(self):
        values = self.fields.get()
        self.save_button.configure(state="disabled", text="Guardando…")
        old_image = self.record.get("image_url")

        def work():
            image = values.pop("image")
            if image and not image.startswith("http"):
                image = self.api.upload_image(image, "banners", "ofertas")
            self.api.save_offers_banner({**values, "image_url": image})
            if old_image and old_image != image:
                self.api.delete_unused_images([old_image])
            return self.api.revalidate_site()

        def done(revalidated):
            self.save_button.configure(state="normal", text="Guardar")
            self.app.changed(None, "Banner de ofertas guardado", revalidated)
            self.load()

        def fail(exc):
            self.save_button.configure(state="normal", text="Guardar")
            show_error(exc)

        self.app.tasks.run(work, done, fail)
