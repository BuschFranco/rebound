"""Zonas de envío: costo, envío gratis, demora y qué provincias/partidos cubre cada una."""

from __future__ import annotations

from typing import Any

import customtkinter as ctk

from db import SLUG_RE, ApiError, slugify
from widgets import DANGER, LINE, MUTED, OK, format_price, ghost_button, hint, parse_int, set_entry

from .base import EditorView

WHOLE = "Toda la provincia"


class ShippingView(EditorView):
    noun = "zona de envío"
    feminine = True
    table = "shipping_zones"
    list_placeholder = "Buscar zona…"

    def __init__(self, master, app):
        self.areas: list[tuple[str, str | None]] = []
        self.provincias: list[dict[str, str]] = []
        self.deptos: dict[str, list[dict[str, str]]] = {}
        super().__init__(master, app)
        self.app.tasks.run(self.api.provincias, self._got_provincias, lambda _e: self.app.status(
            "No se pudo cargar la lista de provincias (Georef). Revisá la conexión a internet.", "error"))

    def fetch(self):
        return self.api.shipping_zones()

    def title_of(self, record):
        return record["name"]

    def to_items(self, records):
        return [{
            "id": z["id"], "title": z["name"] + ("" if z["active"] else " · inactiva"),
            "subtitle": f"{format_price(z['price'])} · {len(z['shipping_zone_areas'])} área(s)"
                        + (f" · gratis desde {format_price(z['free_from'])}" if z.get("free_from") else ""),
            "search": f"{z['name']} {z['id']}", "dim": not z["active"],
        } for z in records]

    # ---------- Formulario ----------
    def build_form(self, f):
        f.title("Zona")
        self.name = f.add("Nombre", ctk.CTkEntry(f, width=320))
        self.id = f.add("Identificador", ctk.CTkEntry(f, width=220),
                        "Interno, no se puede cambiar después de crearla. Si lo dejás vacío se arma con el nombre.")
        self.price = f.add("Costo de envío", ctk.CTkEntry(f, width=140), "En pesos. 0 = envío gratis siempre.")
        self.free_from = f.add("Gratis desde", ctk.CTkEntry(f, width=140),
                               "Subtotal desde el que el envío es gratis. Vacío = nunca gratis.")
        self.eta = f.add("Demora", ctk.CTkEntry(f, width=220, placeholder_text="24 a 48 h hábiles"))
        self.sort_order = f.add("Orden", ctk.CTkEntry(f, width=100))
        self.active = f.add("Activa", ctk.CTkSwitch(f, text="", progress_color=OK),
                            "Apagada = esas áreas pasan a “todavía no llegamos”.")

        f.title("Áreas que cubre")
        f.full(hint(f, "Elegí una provincia entera o partidos/comunas puntuales. Si un partido está en una zona, "
                       "esa zona gana sobre la de su provincia entera."))
        self.areas_box = f.full(ctk.CTkFrame(f, fg_color="transparent"), sticky="ew")
        add = ctk.CTkFrame(f, fg_color="transparent")
        self.prov_menu = ctk.CTkOptionMenu(add, values=["Cargando provincias…"], width=220, command=self._prov_changed)
        self.prov_menu.pack(side="left")
        self.depto_menu = ctk.CTkOptionMenu(add, values=[WHOLE], width=260)
        self.depto_menu.pack(side="left", padx=6)
        ghost_button(add, "+ Agregar", self._add_area, width=100).pack(side="left")
        f.full(add, sticky="w")

    def _got_provincias(self, provincias):
        self.provincias = provincias
        names = [p["nombre"] for p in provincias]
        self.prov_menu.configure(values=names)
        self.prov_menu.set("Buenos Aires" if "Buenos Aires" in names else names[0])
        self._prov_changed(self.prov_menu.get())
        self._render_areas()

    def _prov_id(self, name: str) -> str | None:
        return next((p["id"] for p in self.provincias if p["nombre"] == name), None)

    def _with_deptos(self, prov_id: str, then):
        if prov_id in self.deptos:
            then()
            return

        def got(deptos):
            self.deptos[prov_id] = deptos
            then()

        self.app.tasks.run(lambda: self.api.departamentos(prov_id), got)

    def _prov_changed(self, name: str):
        prov_id = self._prov_id(name)
        if not prov_id:
            return
        self.depto_menu.configure(values=["Cargando…"])
        self.depto_menu.set("Cargando…")

        def show():
            self.depto_menu.configure(values=[WHOLE, *[d["nombre"] for d in self.deptos[prov_id]]])
            self.depto_menu.set(WHOLE)

        self._with_deptos(prov_id, show)

    def _area_name(self, prov_id: str, depto_id: str | None) -> str:
        prov = next((p["nombre"] for p in self.provincias if p["id"] == prov_id), f"Provincia {prov_id}")
        if depto_id is None:
            return f"{prov} · toda la provincia"
        depto = next((d["nombre"] for d in self.deptos.get(prov_id, []) if d["id"] == depto_id), None)
        return f"{prov} · {depto or depto_id}"

    def _render_areas(self):
        for child in self.areas_box.winfo_children():
            child.destroy()
        if not self.areas:
            hint(self.areas_box, "Sin áreas: esta zona no cubre ningún lugar todavía.").pack(anchor="w")
            return
        # Traer nombres de partidos que falten y volver a dibujar.
        missing = {p for p, d in self.areas if d and p not in self.deptos}
        if missing and self.provincias:
            prov = missing.pop()
            self._with_deptos(prov, self._render_areas)
        for i, (prov, depto) in enumerate(sorted(self.areas, key=lambda a: self._area_name(*a))):
            row = ctk.CTkFrame(self.areas_box, fg_color="transparent")
            row.grid(row=i // 2, column=i % 2, sticky="w", padx=(0, 18), pady=1)
            ctk.CTkLabel(row, text=self._area_name(prov, depto), text_color=None if depto else MUTED).pack(side="left")
            ctk.CTkButton(row, text="✕", width=26, height=22, fg_color="transparent", hover_color=LINE,
                          text_color=DANGER, command=lambda a=(prov, depto): self._remove_area(a)).pack(side="left", padx=4)

    def _add_area(self):
        prov_id = self._prov_id(self.prov_menu.get())
        if not prov_id or self.depto_menu.get() == "Cargando…":
            return
        choice = self.depto_menu.get()
        depto_id = None if choice == WHOLE else next(
            (d["id"] for d in self.deptos.get(prov_id, []) if d["nombre"] == choice), None)
        area = (prov_id, depto_id)
        if area not in self.areas:
            self.areas.append(area)
            self._render_areas()

    def _remove_area(self, area):
        self.areas.remove(area)
        self._render_areas()

    def fill(self, z):
        z = z or {}
        set_entry(self.name, z.get("name", ""))
        self.id.configure(state="normal")
        set_entry(self.id, z.get("id", ""))
        self.id.configure(state="disabled" if z else "normal")
        set_entry(self.price, z.get("price", ""))
        set_entry(self.free_from, z.get("free_from") or "")
        set_entry(self.eta, z.get("eta_label", ""))
        set_entry(self.sort_order, z.get("sort_order", max((r["sort_order"] for r in self.records), default=0) + 1))
        if z.get("active", True):
            self.active.select()
        else:
            self.active.deselect()
        self.areas = [(a["provincia_id"], a["departamento_id"]) for a in z.get("shipping_zone_areas", [])]
        self._render_areas()

    def collect(self) -> dict[str, Any]:
        name = self.name.get().strip()
        if not name:
            raise ValueError("Completá el nombre de la zona.")
        price = parse_int(self.price.get(), "el costo de envío")
        free_from = parse_int(self.free_from.get(), "gratis desde", allow_empty=True)
        if free_from == 0:
            raise ValueError("“Gratis desde” tiene que ser mayor a 0 (o dejalo vacío).")
        eta = self.eta.get().strip()
        if not eta:
            raise ValueError("Completá la demora (ej. 24 a 48 h hábiles).")
        values = {"name": name, "price": price, "free_from": free_from, "eta_label": eta,
                  "sort_order": parse_int(self.sort_order.get() or "0", "el orden"),
                  "active": bool(self.active.get()), "_areas": list(self.areas)}
        if not self.current:
            zone_id = self.id.get().strip() or slugify(name)
            if not SLUG_RE.match(zone_id):
                raise ValueError("El identificador solo puede tener minúsculas, números y guiones.")
            values["id"] = zone_id
        return values

    def persist(self, values):
        areas = values.pop("_areas")
        if self.current:
            zone_id = self.current["id"]
            self.api.update("shipping_zones", {"id": zone_id}, values)
            existing = {(a["provincia_id"], a["departamento_id"]): a["id"] for a in self.current["shipping_zone_areas"]}
        else:
            zone_id = values["id"]
            self.api.insert("shipping_zones", values)
            existing = {}
        for area, area_id in existing.items():
            if area not in areas:
                self.api.delete("shipping_zone_areas", {"id": area_id})
        added = [{"zone_id": zone_id, "provincia_id": p, "departamento_id": d} for p, d in areas if (p, d) not in existing]
        if added:
            try:
                self.api.insert("shipping_zone_areas", added)
            except ApiError as exc:
                raise ApiError("La zona se guardó, pero alguna de las áreas nuevas ya pertenece a otra zona. "
                                "Quitala de la otra zona primero.") from exc
        return zone_id
