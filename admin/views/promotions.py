"""Promociones con fechas fijas (iguales para todos). Pueden convivir varias:

- Llevá N, pagá M (3x2) en toda la tienda.
- Descuento en la X unidad: del mismo producto o dentro de categorías elegidas (ej. 2da al 50%).
- Envío gratis: en productos elegidos, desde un monto o llevando X unidades.

Las de envío gratis se suman a las de descuento; si hay varios descuentos vigentes no se acumulan:
el sitio aplica el que más ahorra al cliente.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from tkinter import messagebox
from typing import Any

import customtkinter as ctk

from db import AR_TZ, SLUG_RE, parse_ts, slugify
from widgets import MUTED, OK, SURFACE_2, BannerFields, DateTimeEntry, format_price, hint, parse_int, set_entry

from .base import Cancelled, EditorView

KINDS = {"Llevá N, pagá M": "nxm", "Descuento en la X unidad": "nth_discount", "Envío gratis": "free_shipping"}
KIND_NAMES = {v: k for k, v in KINDS.items()}
SCOPES = {"Mismo producto": "same_product", "Categorías elegidas": "categories"}
RULES = {"Productos elegidos": "products", "Desde un monto": "min_amount", "Llevando X unidades": "min_units"}
ORDINALS = {2: "2da", 3: "3ra", 4: "4ta", 5: "5ta", 6: "6ta", 7: "7ma", 8: "8va", 9: "9na", 10: "10ma"}


def ordinal(n: int) -> str:
    return ORDINALS.get(n, f"{n}ª")


def category_names(slugs: list[str], categories: list[dict[str, Any]]) -> str:
    names = [next((c["label"] for c in categories if c["slug"] == s), s) for s in slugs]
    return f"{', '.join(names[:-1])} o {names[-1]}" if len(names) > 1 else (names[0] if names else "")


def banner_defaults(v: dict[str, Any], categories: list[dict[str, Any]]) -> dict[str, str]:
    """Textos automáticos del banner (los mismos que arma el sitio, src/lib/promo.ts y PromoBanner)."""
    label, kind = v.get("label") or "", v.get("kind")
    if kind == "nxm":
        title = f"{label} en toda la web"
        text = (f"Llevá {v.get('buy')}, pagá {v.get('pay')}: el más barato de cada {v.get('buy')} es gratis. "
                "Combinás modelos, talles y categorías.")
    elif kind == "nth_discount":
        off = "es gratis" if v.get("percent") == 100 else f"tiene {v.get('percent')}% off"
        nth = ordinal(v.get("nth") or 2)
        if v.get("scope") == "categories":
            cats = category_names(v.get("category_slugs") or [], categories)
            title = f"{label} en {cats}"
            text = f"Llevando {v.get('nth')} productos de {cats} (pueden ser modelos distintos), el {nth[:-1]}o más barato {off}."
        else:
            title = f"{label} en el mismo producto"
            text = f"Llevando {v.get('nth')} unidades del mismo producto (pueden ser talles o colores distintos), la {nth} {off}."
    else:
        rule = v.get("shipping_rule")
        title = f"{label} en productos seleccionados" if rule == "products" else label
        text = {"products": "Los productos marcados con envío gratis no pagan envío: alcanza con uno en el pedido.",
                "min_amount": f"Envío gratis en pedidos desde {format_price(v.get('min_amount') or 0)} (con descuentos "
                              "aplicados), dentro de las zonas de entrega.",
                "min_units": f"Envío gratis llevando {v.get('min_units')} productos o más, dentro de las zonas de entrega."
                }.get(rule, "")
    cta = "Ver catálogo" if kind == "free_shipping" else f"Armá tu {label}"
    return {"eyebrow": "Promo · {vigencia}", "title": title, "text": f"{text} También con las ofertas.", "cta": cta}


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
        self.categories: list[dict[str, Any]] = []
        self.products: list[dict[str, Any]] = []
        self.category_vars: dict[str, ctk.StringVar] = {}
        self.selected_products: set[str] = set()
        super().__init__(master, app)

    def fetch(self):
        # Para los selectores de categorías y productos.
        self.categories = self.api.categories()
        self.products = self.api.select("products", select="id,name,category_slug,active", order="name")
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
                "subtitle": f"{KIND_NAMES.get(p.get('kind'), '')} · {starts.astimezone(AR_TZ):%d/%m} → {ends.astimezone(AR_TZ):%d/%m}",
                "search": f"{p['label']} {p['id']} {status}", "dim": status in ("terminada", "inactiva"),
            })
        return items

    # ---------- Formulario ----------
    def build_form(self, f):
        f.title("Tipo de promoción")
        self.kind = f.full(ctk.CTkSegmentedButton(f, values=list(KINDS), command=lambda _v: self._kind_changed()), sticky="w")
        self.kind_hint = f.full(hint(f, ""))
        self.kind_box = f.full(ctk.CTkFrame(f, fg_color="transparent"), sticky="ew")

        # Llevá N, pagá M
        self.nxm_frame = ctk.CTkFrame(self.kind_box, fg_color="transparent")
        row = ctk.CTkFrame(self.nxm_frame, fg_color="transparent")
        row.pack(anchor="w")
        ctk.CTkLabel(row, text="Llevando").pack(side="left")
        self.buy = ctk.CTkEntry(row, width=60)
        self.buy.pack(side="left", padx=6)
        ctk.CTkLabel(row, text="pagás").pack(side="left")
        self.pay = ctk.CTkEntry(row, width=60)
        self.pay.pack(side="left", padx=6)
        hint(self.nxm_frame, "En toda la tienda: en cada grupo, las unidades más baratas salen gratis.").pack(anchor="w", pady=(4, 0))

        # Descuento en la X unidad
        self.nth_frame = ctk.CTkFrame(self.kind_box, fg_color="transparent")
        row = ctk.CTkFrame(self.nth_frame, fg_color="transparent")
        row.pack(anchor="w")
        ctk.CTkLabel(row, text="La unidad número").pack(side="left")
        self.nth = ctk.CTkEntry(row, width=50)
        self.nth.pack(side="left", padx=6)
        ctk.CTkLabel(row, text="tiene").pack(side="left")
        self.percent = ctk.CTkEntry(row, width=60)
        self.percent.pack(side="left", padx=6)
        ctk.CTkLabel(row, text="% de descuento   (100 = gratis)").pack(side="left")
        self.scope = ctk.CTkSegmentedButton(self.nth_frame, values=list(SCOPES), command=lambda _v: self._scope_changed())
        self.scope.pack(anchor="w", pady=(10, 4))
        self.scope_hint = hint(self.nth_frame, "")
        self.scope_hint.pack(anchor="w")
        self.categories_box = ctk.CTkFrame(self.nth_frame, fg_color="transparent")

        # Envío gratis
        self.fs_frame = ctk.CTkFrame(self.kind_box, fg_color="transparent")
        self.rule = ctk.CTkSegmentedButton(self.fs_frame, values=list(RULES), command=lambda _v: self._rule_changed())
        self.rule.pack(anchor="w")
        self.rule_box = ctk.CTkFrame(self.fs_frame, fg_color="transparent")
        self.rule_box.pack(anchor="w", fill="x", pady=(8, 0))
        self.amount_row = ctk.CTkFrame(self.rule_box, fg_color="transparent")
        ctk.CTkLabel(self.amount_row, text="Pedidos desde $").pack(side="left")
        self.min_amount = ctk.CTkEntry(self.amount_row, width=120, placeholder_text="ej. 100000")
        self.min_amount.pack(side="left", padx=6)
        hint(self.amount_row, "(con descuentos aplicados)").pack(side="left")
        self.units_row = ctk.CTkFrame(self.rule_box, fg_color="transparent")
        ctk.CTkLabel(self.units_row, text="Llevando").pack(side="left")
        self.min_units = ctk.CTkEntry(self.units_row, width=60)
        self.min_units.pack(side="left", padx=6)
        ctk.CTkLabel(self.units_row, text="productos o más").pack(side="left")
        self.products_box = ctk.CTkFrame(self.rule_box, fg_color="transparent")
        self.product_search = ctk.CTkEntry(self.products_box, width=320, placeholder_text="Buscar producto…")
        self.product_search.pack(anchor="w")
        self.product_search.bind("<KeyRelease>", lambda _e: self._render_products())
        self.products_count = ctk.CTkLabel(self.products_box, text="", text_color=MUTED)
        self.products_count.pack(anchor="w")
        self.products_list = ctk.CTkScrollableFrame(self.products_box, height=180, width=420, fg_color=SURFACE_2)
        self.products_list.pack(anchor="w", pady=(4, 0))

        for entry in (self.buy, self.pay, self.nth, self.percent, self.min_amount, self.min_units):
            entry.bind("<KeyRelease>", self._auto_label)

        f.title("Cómo se ve")
        self.label = f.add("Etiqueta", ctk.CTkEntry(f, width=300),
                           "Lo que se ve en el sitio. Se arma sola (“3x2”, “2da al 50%”, “Envío gratis desde $100.000”).")
        self.label.bind("<KeyRelease>", lambda _e: (setattr(self, "label_touched", True), self._refresh_banner_placeholders()))
        self.id = f.add("Identificador", ctk.CTkEntry(f, width=260),
                        "Interno, no se puede cambiar después de crearla. Si lo dejás vacío se arma solo.")

        f.title("Banner en la home (opcional)")
        f.full(hint(f, "Se muestra cuando esta es la promo principal (la primera de descuento vigente)."))
        self.banner = f.full(BannerFields(f, self.app.thumbs, "{etiqueta}, {vigencia}"), sticky="ew")

        f.title("Vigencia (hora de Argentina)")
        self.starts = f.add("Desde", DateTimeEntry(f))
        self.ends = f.add("Hasta", DateTimeEntry(f))
        f.full(hint(f, "Pueden convivir varias promos. Las de envío gratis se suman a los descuentos; si hay varios "
                       "descuentos vigentes no se acumulan: el carrito aplica el que más ahorra al cliente."))
        self.active = f.add("Activa", ctk.CTkSwitch(f, text="", progress_color=OK),
                            "Apagada = no se muestra ni se aplica, aunque esté dentro de las fechas.")

    # ---------- Mostrar los campos según el tipo ----------
    def _kind(self) -> str:
        return KINDS[self.kind.get()]

    def _kind_changed(self):
        for frame in (self.nxm_frame, self.nth_frame, self.fs_frame):
            frame.pack_forget()
        kind = self._kind()
        {"nxm": self.nxm_frame, "nth_discount": self.nth_frame, "free_shipping": self.fs_frame}[kind].pack(anchor="w", fill="x")
        self.kind_hint.configure(text={
            "nxm": "Ej.: 3x2 en toda la tienda.",
            "nth_discount": "Ej.: 2da al 50% en el mismo producto, o en Camisetas mezclando modelos.",
            "free_shipping": "Se suma a cualquier descuento. Dentro de las zonas de entrega.",
        }[kind])
        if kind == "nth_discount":
            self._scope_changed()
        if kind == "free_shipping":
            self._rule_changed()
        self._auto_label()

    def _scope_changed(self):
        categories = SCOPES[self.scope.get()] == "categories"
        self.scope_hint.configure(text="Elegí en qué categorías aplica (se pueden mezclar modelos dentro de cada una)."
                                  if categories else "Las unidades pueden ser de talles o colores distintos del mismo producto.")
        if categories:
            self.categories_box.pack(anchor="w", pady=(6, 0))
        else:
            self.categories_box.pack_forget()
        self._auto_label()

    def _rule_changed(self):
        for row in (self.amount_row, self.units_row, self.products_box):
            row.pack_forget()
        rule = RULES[self.rule.get()]
        {"min_amount": self.amount_row, "min_units": self.units_row, "products": self.products_box}[rule].pack(anchor="w", fill="x")
        if rule == "products":
            self._render_products()
        self._auto_label()

    def _render_categories(self, selected: list[str]):
        for child in self.categories_box.winfo_children():
            child.destroy()
        self.category_vars = {}
        for i, c in enumerate(self.categories):
            var = ctk.StringVar(value=c["slug"] if c["slug"] in selected else "")
            ctk.CTkCheckBox(self.categories_box, text=c["label"], variable=var, onvalue=c["slug"], offvalue="",
                            command=self._auto_label).grid(row=i // 3, column=i % 3, sticky="w", padx=(0, 16), pady=3)
            self.category_vars[c["slug"]] = var

    def _render_products(self):
        for child in self.products_list.winfo_children():
            child.destroy()
        query = self.product_search.get().strip().lower()
        shown = [p for p in self.products if query in p["name"].lower()]
        for p in shown[:120]:
            box = ctk.CTkCheckBox(self.products_list, text=p["name"] + ("" if p["active"] else "  (oculto)"),
                                  command=lambda pid=p["id"]: self._toggle_product(pid))
            if p["id"] in self.selected_products:
                box.select()
            box.pack(anchor="w", pady=2)
        self.products_count.configure(text=f"{len(self.selected_products)} elegido(s) · {len(shown)} producto(s)")

    def _toggle_product(self, product_id: str):
        self.selected_products ^= {product_id}
        self.products_count.configure(text=f"{len(self.selected_products)} elegido(s)")

    # ---------- Etiqueta automática ----------
    def _num(self, entry) -> int | None:
        try:
            return parse_int(entry.get(), "")
        except ValueError:
            return None

    def _suggested_label(self) -> str:
        kind = self._kind()
        if kind == "nxm":
            return f"{self.buy.get().strip()}x{self.pay.get().strip()}"
        if kind == "nth_discount":
            nth, percent = self._num(self.nth) or 2, self._num(self.percent) or 0
            return f"{ordinal(nth)} {'gratis' if percent == 100 else f'al {percent}%'}"
        rule = RULES[self.rule.get()]
        if rule == "min_amount":
            return f"Envío gratis desde {format_price(self._num(self.min_amount) or 0)}"
        if rule == "min_units":
            return f"Envío gratis llevando {self._num(self.min_units) or ''}".strip()
        return "Envío gratis"

    def _auto_label(self, _event=None):
        if not self.label_touched:
            set_entry(self.label, self._suggested_label())
        self._refresh_banner_placeholders()

    def _refresh_banner_placeholders(self):
        if not hasattr(self, "banner"):
            return
        v: dict[str, Any] = {"kind": self._kind(), "label": self.label.get().strip() or self._suggested_label(),
                             "buy": self._num(self.buy), "pay": self._num(self.pay), "nth": self._num(self.nth),
                             "percent": self._num(self.percent), "scope": SCOPES[self.scope.get()],
                             "category_slugs": [k for k, var in self.category_vars.items() if var.get()],
                             "shipping_rule": RULES[self.rule.get()], "min_amount": self._num(self.min_amount),
                             "min_units": self._num(self.min_units)}
        self.banner.set_placeholders(banner_defaults(v, self.categories))

    # ---------- Cargar / leer ----------
    def fill(self, p):
        p = p or {}
        self.kind.set(KIND_NAMES.get(p.get("kind", "nxm")))
        set_entry(self.buy, p.get("buy") or 3)
        set_entry(self.pay, p.get("pay") or 2)
        set_entry(self.nth, p.get("nth") or 2)
        set_entry(self.percent, p.get("percent") or 50)
        self.scope.set(next(k for k, v in SCOPES.items() if v == (p.get("scope") or "same_product")))
        self._render_categories(p.get("category_slugs") or [])
        self.rule.set(next(k for k, v in RULES.items() if v == (p.get("shipping_rule") or "min_amount")))
        set_entry(self.min_amount, p.get("min_amount") or "")
        set_entry(self.min_units, p.get("min_units") or 3)
        self.selected_products = set(p.get("product_ids") or [])
        set_entry(self.product_search, "")
        self.label_touched = bool(p)
        set_entry(self.label, p.get("label", ""))
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
        self.banner.set({"eyebrow": p.get("banner_eyebrow"), "title": p.get("banner_title"), "text": p.get("banner_text"),
                         "cta": p.get("banner_cta"), "image_url": p.get("banner_image_url")})
        self._kind_changed()

    def collect(self):
        kind = self._kind()
        # Todos los campos de tipo, en blanco salvo los del tipo elegido (la base lo valida igual).
        values: dict[str, Any] = {"kind": kind, "buy": None, "pay": None, "nth": None, "percent": None, "scope": None,
                                  "category_slugs": [], "shipping_rule": None, "product_ids": [],
                                  "min_amount": None, "min_units": None}
        if kind == "nxm":
            buy = parse_int(self.buy.get(), "cuántas se llevan")
            pay = parse_int(self.pay.get(), "cuántas se pagan")
            if buy < 2:
                raise ValueError("La promo tiene que ser de al menos 2 unidades (ej. 2x1).")
            if not 1 <= pay < buy:
                raise ValueError("Lo que se paga tiene que ser al menos 1 y menos de lo que se lleva.")
            values.update(buy=buy, pay=pay)
        elif kind == "nth_discount":
            nth = parse_int(self.nth.get(), "el número de unidad")
            percent = parse_int(self.percent.get(), "el porcentaje")
            if nth < 2:
                raise ValueError("El descuento tiene que ser desde la 2da unidad.")
            if not 1 <= percent <= 100:
                raise ValueError("El porcentaje tiene que ser entre 1 y 100.")
            scope = SCOPES[self.scope.get()]
            slugs = [s for s, var in self.category_vars.items() if var.get()] if scope == "categories" else []
            if scope == "categories" and not slugs:
                raise ValueError("Elegí al menos una categoría.")
            values.update(nth=nth, percent=percent, scope=scope, category_slugs=slugs)
        else:
            rule = RULES[self.rule.get()]
            values["shipping_rule"] = rule
            if rule == "min_amount":
                amount = parse_int(self.min_amount.get(), "el monto mínimo")
                if amount <= 0:
                    raise ValueError("El monto mínimo tiene que ser mayor a 0.")
                values["min_amount"] = amount
            elif rule == "min_units":
                units = parse_int(self.min_units.get(), "la cantidad de productos")
                if units < 1:
                    raise ValueError("La cantidad tiene que ser al menos 1.")
                values["min_units"] = units
            else:
                if not self.selected_products:
                    raise ValueError("Elegí al menos un producto con envío gratis.")
                values["product_ids"] = sorted(self.selected_products)

        label = self.label.get().strip() or self._suggested_label()
        starts = self.starts.get("Desde")
        ends = self.ends.get("Hasta")
        if ends <= starts:
            raise ValueError("La fecha “Hasta” tiene que ser posterior a “Desde”.")
        values.update(label=label, starts_at=starts.isoformat(), ends_at=ends.isoformat(), active=bool(self.active.get()))
        banner = self.banner.get()
        values.update(banner_eyebrow=banner["eyebrow"], banner_title=banner["title"], banner_text=banner["text"],
                      banner_cta=banner["cta"], banner_image_url=banner["image"])
        if not self.current:
            promo_id = self.id.get().strip() or slugify(f"{label}-{starts:%Y-%m-%d}")[:60]
            if not SLUG_RE.match(promo_id):
                raise ValueError("El identificador solo puede tener minúsculas, números y guiones.")
            values["id"] = promo_id

        # Dos descuentos a la vez no se acumulan: avisar para que no sea una sorpresa.
        if values["active"] and kind != "free_shipping":
            own = (self.current or {}).get("id")
            clash = [p for p in self.records if p["id"] != own and p["active"] and p.get("kind") != "free_shipping"
                     and parse_ts(p["starts_at"]) < ends and starts < parse_ts(p["ends_at"])]
            if clash and not messagebox.askyesno(
                    "Descuentos superpuestos",
                    "En esas fechas también está: " + ", ".join(p["label"] for p in clash)
                    + ".\n\nLos descuentos no se acumulan: en cada carrito se aplica el que más ahorra. ¿Guardar igual?"):
                raise Cancelled
        return values

    def persist(self, values):
        image = values.get("banner_image_url")
        if image and not image.startswith("http"):
            values["banner_image_url"] = self.api.upload_image(image, "banners", values.get("id") or self.current["id"])
        if self.current:
            old_image = self.current.get("banner_image_url")
            self.api.update("promotions", {"id": self.current["id"]}, values)
            if old_image and old_image != values["banner_image_url"]:
                self.api.delete_unused_images([old_image])
            return self.current["id"]
        self.api.insert("promotions", values)
        return values["id"]

    def remove(self, record):
        self.api.delete("promotions", {"id": record["id"]})
        if record.get("banner_image_url"):
            self.api.delete_unused_images([record["banner_image_url"]])
