"""Promociones NxM con vigencia de fechas fijas (iguales para todos los clientes)."""

from __future__ import annotations

from datetime import datetime, timedelta
from tkinter import messagebox

import customtkinter as ctk

from db import AR_TZ, SLUG_RE, parse_ts, slugify
from widgets import OK, DateTimeEntry, hint, parse_int, set_entry

from .base import Cancelled, EditorView


def status_of(p, now: datetime) -> str:
    starts, ends = parse_ts(p["starts_at"]), parse_ts(p["ends_at"])
    if not p["active"]:
        return "inactiva"
    if ends <= now:
        return "terminada"
    if starts > now:
        return "próxima"
    return "VIGENTE"


class PromotionsView(EditorView):
    noun = "promoción"
    feminine = True
    table = "promotions"
    list_placeholder = "Buscar promoción…"

    def __init__(self, master, app):
        self.label_touched = False
        super().__init__(master, app)

    def fetch(self):
        return self.api.promotions()

    def title_of(self, record):
        return f"Promo {record['label']}"

    def to_items(self, records):
        now = datetime.now(AR_TZ)
        items = []
        for p in records:
            starts, ends = parse_ts(p["starts_at"]), parse_ts(p["ends_at"])
            status = status_of(p, now)
            items.append({
                "id": p["id"], "title": f"{p['label']} · {status}",
                "subtitle": f"{starts.astimezone(AR_TZ):%d/%m/%Y} → {ends.astimezone(AR_TZ):%d/%m/%Y}",
                "search": f"{p['label']} {p['id']} {status}", "dim": status in ("terminada", "inactiva"),
            })
        return items

    def build_form(self, f):
        f.title("Mecánica")
        row = ctk.CTkFrame(f, fg_color="transparent")
        ctk.CTkLabel(row, text="Llevando").pack(side="left")
        self.buy = ctk.CTkEntry(row, width=60)
        self.buy.pack(side="left", padx=6)
        ctk.CTkLabel(row, text="pagás").pack(side="left")
        self.pay = ctk.CTkEntry(row, width=60)
        self.pay.pack(side="left", padx=6)
        f.add("Regla", row, "En cada grupo, las unidades más baratas salen gratis. Ej.: llevando 3 pagás 2 (3x2).")
        for entry in (self.buy, self.pay):
            entry.bind("<KeyRelease>", self._auto_label)
        self.label = f.add("Etiqueta", ctk.CTkEntry(f, width=140), "Lo que se ve en el sitio (se arma sola: “3x2”).")
        self.label.bind("<KeyRelease>", lambda _e: setattr(self, "label_touched", True))
        self.id = f.add("Identificador", ctk.CTkEntry(f, width=260),
                        "Interno, no se puede cambiar después de crearla. Si lo dejás vacío se arma solo.")

        f.title("Vigencia (hora de Argentina)")
        self.starts = f.add("Desde", DateTimeEntry(f))
        self.ends = f.add("Hasta", DateTimeEntry(f))
        f.full(hint(f, "El sitio muestra la promo vigente (o la próxima a empezar) con su cuenta regresiva, "
                       "y las condiciones legales con estas fechas."))
        self.active = f.add("Activa", ctk.CTkSwitch(f, text="", progress_color=OK),
                            "Apagada = no se muestra ni se aplica, aunque esté dentro de las fechas.")

    def _auto_label(self, _event=None):
        if not self.label_touched:
            set_entry(self.label, f"{self.buy.get().strip()}x{self.pay.get().strip()}")

    def fill(self, p):
        p = p or {}
        set_entry(self.buy, p.get("buy", 3))
        set_entry(self.pay, p.get("pay", 2))
        set_entry(self.label, p.get("label", "3x2"))
        self.label_touched = bool(p)
        self.id.configure(state="normal")
        set_entry(self.id, p.get("id", ""))
        self.id.configure(state="disabled" if p else "normal")
        now = datetime.now(AR_TZ).replace(second=0, microsecond=0)
        self.starts.set(parse_ts(p.get("starts_at")) or now.replace(hour=0, minute=0))
        self.ends.set(parse_ts(p.get("ends_at")) or (now + timedelta(days=14)).replace(hour=23, minute=59))
        if p.get("active", True):
            self.active.select()
        else:
            self.active.deselect()

    def collect(self):
        buy = parse_int(self.buy.get(), "cuántas se llevan")
        pay = parse_int(self.pay.get(), "cuántas se pagan")
        if buy < 2:
            raise ValueError("La promo tiene que ser de al menos 2 unidades (ej. 2x1).")
        if not 1 <= pay < buy:
            raise ValueError("Lo que se paga tiene que ser al menos 1 y menos de lo que se lleva.")
        label = self.label.get().strip() or f"{buy}x{pay}"
        starts = self.starts.get("Desde")
        ends = self.ends.get("Hasta")
        if ends <= starts:
            raise ValueError("La fecha “Hasta” tiene que ser posterior a “Desde”.")
        values = {"label": label, "buy": buy, "pay": pay, "starts_at": starts.isoformat(),
                  "ends_at": ends.isoformat(), "active": bool(self.active.get())}
        if not self.current:
            promo_id = self.id.get().strip() or slugify(f"{label}-{starts:%Y-%m-%d}")
            if not SLUG_RE.match(promo_id):
                raise ValueError("El identificador solo puede tener minúsculas, números y guiones.")
            values["id"] = promo_id
        # El sitio usa una sola promo a la vez: avisar si se pisa con otra activa.
        if values["active"]:
            own = (self.current or {}).get("id")
            clash = [p for p in self.records if p["id"] != own and p["active"]
                     and parse_ts(p["starts_at"]) < ends and starts < parse_ts(p["ends_at"])]
            if clash and not messagebox.askyesno(
                    "Fechas superpuestas",
                    "Se superpone con: " + ", ".join(f"{p['label']} ({p['id']})" for p in clash)
                    + ".\n\nEl sitio muestra una sola promo (la que empieza primero). ¿Guardar igual?"):
                raise Cancelled
        return values

    def persist(self, values):
        if self.current:
            self.api.update("promotions", {"id": self.current["id"]}, values)
            return self.current["id"]
        self.api.insert("promotions", values)
        return values["id"]
