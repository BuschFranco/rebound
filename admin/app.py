"""REBOUND · Panel de administración.

Edita el catálogo de Supabase (productos, categorías, promociones y zonas de envío) y avisa al sitio
para que muestre los cambios al instante. Se abre con admin/iniciar.bat o `python admin/app.py`.
"""

from __future__ import annotations

import sys
from pathlib import Path
from tkinter import messagebox

sys.path.insert(0, str(Path(__file__).resolve().parent))

import customtkinter as ctk  # noqa: E402

from config import ConfigError, load_config  # noqa: E402
from db import Api  # noqa: E402
from views.banners import BannersView  # noqa: E402
from views.categories import CategoriesView  # noqa: E402
from views.orders import OrdersView  # noqa: E402
from views.products import ProductsView  # noqa: E402
from views.promotions import PromotionsView  # noqa: E402
from views.shipping import ShippingView  # noqa: E402
from widgets import (ACCENT, ACCENT_HOVER, DANGER, LINE, MUTED, OK, SURFACE, SURFACE_2, Tasks,  # noqa: E402
                     ThumbCache, ghost_button)


class AdminApp(ctk.CTk):
    def __init__(self, api: Api):
        super().__init__()
        self.api = api
        self.title("REBOUND · Panel de administración")
        self.geometry("1320x860")
        self.minsize(1100, 680)
        self.configure(fg_color="#0b0a0f")

        # Barra de estado primero: las pestañas ya lanzan tareas al crearse.
        bar = ctk.CTkFrame(self, fg_color=SURFACE, corner_radius=0, height=34)
        bar.pack(fill="x", side="bottom")
        self.status_label = ctk.CTkLabel(bar, text="Conectando…", text_color=MUTED, anchor="w")
        self.status_label.pack(side="left", padx=16)
        self.busy_label = ctk.CTkLabel(bar, text="", text_color=ACCENT)
        self.busy_label.pack(side="right", padx=16)
        self.tasks = Tasks(self, self._busy)
        self.thumbs = ThumbCache(self.tasks, api.fetch_bytes)

        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(14, 0))
        ctk.CTkLabel(header, text="REBOUND", font=ctk.CTkFont(size=26, weight="bold", slant="italic")).pack(side="left")
        ctk.CTkLabel(header, text="  Panel de administración", text_color=MUTED).pack(side="left", pady=(6, 0))
        ghost_button(header, "↻ Recargar todo", self.reload_all, width=130).pack(side="right")
        target = "local (Docker)" if "127.0.0.1" in api.config.supabase_url or "localhost" in api.config.supabase_url \
            else api.config.supabase_url.replace("https://", "")
        ctk.CTkLabel(header, text=f"Base: {target}", text_color=MUTED).pack(side="right", padx=12)

        self.tabs = ctk.CTkTabview(self, fg_color="transparent", segmented_button_selected_color=ACCENT,
                                   segmented_button_selected_hover_color=ACCENT_HOVER, command=self._tab_changed)
        self.tabs.pack(fill="both", expand=True, padx=14, pady=(4, 0))
        self.views = {}
        for name, cls in (("Productos", ProductsView), ("Categorías", CategoriesView),
                          ("Promociones", PromotionsView), ("Banners", BannersView), ("Envíos", ShippingView), ("Pedidos", OrdersView)):
            tab = self.tabs.add(name)
            view = cls(tab, self)
            view.pack(fill="both", expand=True)
            self.views[name] = view
        self.tabs._segmented_button.configure(font=ctk.CTkFont(size=14, weight="bold"), text_color=("#000", "#fff"))

        self.reload_all()

    # ---------- Estado ----------
    def _busy(self, busy: bool):
        self.busy_label.configure(text="● trabajando…" if busy else "")

    def status(self, text: str, kind: str = "info"):
        color = {"ok": OK, "error": DANGER, "warn": ACCENT}.get(kind, MUTED)
        self.status_label.configure(text=text, text_color=color)

    def changed(self, view, what: str, revalidated: bool):
        if revalidated:
            self.status(f"✓ {what} · el sitio ya muestra el cambio", "ok")
        else:
            self.status(f"✓ {what} · el sitio lo muestra en menos de 1 minuto (no se pudo avisar a {self.api.config.site_url or 'SITE_URL'})", "warn")
        # Las categorías alimentan el desplegable de productos.
        if isinstance(view, CategoriesView):
            self.refresh_categories()

    def refresh_categories(self):
        self.tasks.run(self.api.categories, self.views["Productos"].set_categories)

    def reload_all(self):
        def ok(categories):
            self.views["Productos"].set_categories(categories)
            for view in self.views.values():
                view.load()
            self.status(f"Conectado · {len(categories)} categorías", "ok")

        def fail(exc):
            self.status(str(exc).splitlines()[0], "error")
            messagebox.showerror("Sin conexión", str(exc))

        self.tasks.run(self.api.categories, ok, fail)

    def _tab_changed(self):
        # Al volver a Productos, refrescar la lista por si cambió alguna categoría.
        if self.tabs.get() == "Productos":
            self.views["Productos"]._refresh_list()


def brand_theme():
    """Reemplaza los azules del tema por los colores de la marca."""
    t = ctk.ThemeManager.theme

    def both(color):  # (modo claro, modo oscuro)
        return [color, color]

    t["CTkButton"].update(fg_color=both(ACCENT), hover_color=both(ACCENT_HOVER))
    t["CTkOptionMenu"].update(fg_color=both(SURFACE_2), button_color=both(LINE), button_hover_color=both(ACCENT))
    t["CTkCheckBox"].update(fg_color=both(ACCENT), hover_color=both(ACCENT_HOVER), checkmark_color=both("#000"))
    t["CTkSwitch"].update(progress_color=both(ACCENT))
    t["CTkSegmentedButton"].update(selected_color=both(ACCENT), selected_hover_color=both(ACCENT_HOVER))
    t["CTkEntry"].update(border_color=both(LINE), fg_color=both(SURFACE_2))
    t["CTkTextbox"].update(fg_color=both(SURFACE_2), border_color=both(LINE))
    t["CTkScrollbar"].update(button_color=both(LINE), button_hover_color=both(ACCENT))


def main():
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("dark-blue")
    brand_theme()
    try:
        config = load_config()
    except ConfigError as exc:
        root = ctk.CTk()
        root.withdraw()
        messagebox.showerror("Falta configurar el panel", str(exc))
        root.destroy()
        return
    app = AdminApp(Api(config))
    app.mainloop()


if __name__ == "__main__":
    main()
