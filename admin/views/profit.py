"""Ganancias: cuánto ganaste, si el margen es saludable, si le ganás a la inflación y cuánto capital tenés en stock."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any

import customtkinter as ctk

from db import parse_ts
from inflation import Inflation, load_inflation
from inventory import (FAIR_MARGIN, HEALTH, HEALTHY_MARGIN, ProductStock, build_stock, health, is_running, margin,
                       markup, price_for_margin, promo_impacts)
from widgets import ACCENT, MUTED, SURFACE, SURFACE_2, clip, format_price, ghost_button, hint, parse_int, section_title

if TYPE_CHECKING:
    from app import AdminApp

PERIODS = {"30 días": 30, "90 días": 90, "1 año": 365, "Todo": None}


def pct(value: float, decimals: int = 0) -> str:
    return f"{value * 100:.{decimals}f} %".replace(".", ",")


class ProfitView(ctk.CTkFrame):
    def __init__(self, master, app: "AdminApp"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.api = app.api
        self.stocks: dict[str, ProductStock] = {}
        self.sales: list[dict[str, Any]] = []
        self.promos: list[dict[str, Any]] = []
        self.inflation = Inflation({})

        top = ctk.CTkFrame(self, fg_color="transparent")
        top.pack(fill="x")
        ctk.CTkLabel(top, text="Ganancias", font=ctk.CTkFont(size=22, weight="bold")).pack(side="left")
        ghost_button(top, "↻ Actualizar", self.load, width=110).pack(side="right")
        self.period = ctk.CTkSegmentedButton(top, values=list(PERIODS), command=lambda _v: self._render())
        self.period.set("30 días")
        self.period.pack(side="right", padx=10)
        self.source = hint(self, "")
        self.source.configure(wraplength=1100)
        self.source.pack(anchor="w", pady=(2, 8))

        self.cards: dict[str, tuple[ctk.CTkLabel, ctk.CTkLabel]] = {}
        self._card_row((("revenue", "Facturado"), ("cost", "Costo de lo vendido"), ("profit", "Ganancia"),
                        ("margin", "Margen"), ("inflation", "Inflación del período"), ("real", "Ganancia real")))
        self._card_row((("stock_cost", "Capital en stock (al costo)"), ("stock_price", "Stock a precio de venta"),
                        ("stock_profit", "Ganancia si vendés todo"), ("stock_units", "Unidades en stock")))

        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, pady=(10, 0))
        body.grid_columnconfigure(0, weight=5)
        body.grid_columnconfigure(1, weight=2)
        body.grid_rowconfigure(0, weight=1)

        left = ctk.CTkFrame(body, fg_color=SURFACE, corner_radius=10)
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
        section_title(left, "Por producto").pack(anchor="w", padx=14, pady=(12, 0))
        hint(left, f"Margen = ganancia sobre el precio de venta: saludable desde {pct(HEALTHY_MARGIN)}, justo desde "
                   f"{pct(FAIR_MARGIN)}, poco margen por debajo. “Con promo” es el peor caso de las promos vigentes. "
                   "“Reposición” es lo que te saldría hoy volver a comprarlo (costo + inflación desde la compra).") \
            .pack(anchor="w", padx=14)
        self.table = ctk.CTkScrollableFrame(left, fg_color="transparent")
        self.table.pack(fill="both", expand=True, padx=6, pady=(4, 8))

        self._build_simulator(body)

    def _card_row(self, items):
        row = ctk.CTkFrame(self, fg_color="transparent")
        row.pack(fill="x", pady=(0, 8))
        for i, (key, label) in enumerate(items):
            card = ctk.CTkFrame(row, fg_color=SURFACE, corner_radius=10)
            card.grid(row=0, column=i, sticky="ew", padx=(0, 10))
            row.grid_columnconfigure(i, weight=1)
            ctk.CTkLabel(card, text=label.upper(), text_color=MUTED, font=ctk.CTkFont(size=10, weight="bold")) \
                .pack(anchor="w", padx=12, pady=(10, 0))
            value = ctk.CTkLabel(card, text="—", font=ctk.CTkFont(size=20, weight="bold"), text_color=ACCENT)
            value.pack(anchor="w", padx=12)
            note = ctk.CTkLabel(card, text="", text_color=MUTED, font=ctk.CTkFont(size=10), anchor="w", justify="left")
            note.pack(anchor="w", padx=12, pady=(0, 8))
            self.cards[key] = (value, note)

    def _set(self, key: str, value: str, note: str = "", color: str | None = None):
        label, note_label = self.cards[key]
        label.configure(text=value, text_color=color or ACCENT)
        note_label.configure(text=note)

    # ---------- Datos ----------
    def load(self):
        def fetch():
            return (self.api.products(), self.api.movements(), self.api.sales(), self.api.promotions(),
                    load_inflation())

        self.app.tasks.run(fetch, self._loaded)

    def _loaded(self, data):
        products, movements, self.sales, promos, self.inflation = data
        self.stocks = build_stock(products, movements)
        self.promos = [p for p in promos if is_running(p)]
        inf = self.inflation
        self.source.configure(text=(
            f"Inflación: IPC de INDEC (último dato {inf.last_label}). Los meses todavía sin publicar se estiman con el "
            "último valor (marcados con *)." if inf.available else
            "Inflación: sin datos (no hay internet y no hay una copia guardada). El resto funciona igual."))
        self._render()
        self._simulate()

    # ---------- Resumen ----------
    def _render(self):
        now = datetime.now(timezone.utc)
        days = PERIODS[self.period.get()]
        active = [s for s in self.sales if not s.get("cancelled_at")]
        sales = [s for s in active if days is None or parse_ts(s["sold_at"]) >= now - timedelta(days=days)]
        revenue = sum(s["revenue"] for s in sales)
        cost = sum(s["cost"] for s in sales)
        profit = revenue - cost

        # Ganancia real: lo cobrado menos lo que te saldría reponer lo vendido el día de la venta.
        real_cost, estimated = 0.0, False
        for s in sales:
            sold_at = parse_ts(s["sold_at"])
            for item in s["items"]:
                stock = self.stocks.get(item.get("product_id"))
                bought = stock.cost_date if stock and stock.cost_date and stock.cost_date < sold_at else sold_at
                growth = self.inflation.between(bought, sold_at)
                estimated |= growth.estimated and self.inflation.available
                real_cost += int(item.get("unit_cost") or 0) * int(item.get("quantity") or 0) * growth.factor
        real = revenue - real_cost
        star = "*" if estimated else ""

        if sales:
            m = margin(revenue, cost) if revenue else 0
            label, color = HEALTH[health(m)]
            self._set("revenue", format_price(revenue), f"{len(sales)} ventas")
            self._set("cost", format_price(cost))
            self._set("profit", format_price(profit), f"markup {pct(markup(revenue, cost))}" if cost else "")
            self._set("margin", pct(m), label, color)
            self._set("real", format_price(round(real)) + star,
                      "descontando la reposición" if self.inflation.available else "sin datos de inflación",
                      HEALTH["good"][1] if real > 0 else HEALTH["low"][1])
        else:
            for key in ("revenue", "cost", "profit", "margin", "real"):
                self._set(key, "—", "sin ventas registradas" if key == "revenue" else "")

        start = now - timedelta(days=days) if days else (min((parse_ts(s["sold_at"]) for s in active), default=now))
        growth = self.inflation.between(start, now)
        if self.inflation.available and start < now:
            beat = ""
            if sales and cost:
                beat = "le ganás ✓" if markup(revenue, cost) > growth.percent / 100 else "no le ganás ✗"
            self._set("inflation", pct(growth.factor - 1, 1) + ("*" if growth.estimated else ""),
                      f"tu markup {beat}" if beat else "")
        else:
            self._set("inflation", "—", "sin datos" if not self.inflation.available else "")

        tracked = [s for s in self.stocks.values() if s.tracked]
        stock_cost = sum((s.avg_cost or 0) * s.units for s in tracked)
        stock_price = sum(s.product["price"] * s.units for s in tracked)
        units = sum(s.units for s in tracked)
        self._set("stock_cost", format_price(round(stock_cost)), f"{len(tracked)} productos con stock controlado")
        self._set("stock_price", format_price(stock_price))
        self._set("stock_profit", format_price(round(stock_price - stock_cost)),
                  f"margen {pct(margin(stock_price, stock_cost))}" if stock_price else "")
        self._set("stock_units", str(units))
        self._render_table()

    def _render_table(self):
        for child in self.table.winfo_children():
            child.destroy()
        headers = ("Producto", "Precio", "Costo", "Gana/u.", "Margen", "Con promo", "Reposición", "Real/u.",
                   "Stock", "Sin vender")
        for j, text in enumerate(headers):
            ctk.CTkLabel(self.table, text=text.upper(), text_color=MUTED, font=ctk.CTkFont(size=10, weight="bold"),
                         anchor="w" if j == 0 else "e", width=180 if j == 0 else 0)                 .grid(row=0, column=j, sticky="ew", padx=6, pady=(0, 4))
        self.table.grid_columnconfigure(0, weight=1, minsize=170)

        now = datetime.now(timezone.utc)
        rows = sorted(self.stocks.values(), key=lambda s: (
            s.avg_cost is None, {"low": 0, "fair": 1, "good": 2}.get(health(self._margin(s)), 3), s.product["name"]))
        for i, s in enumerate(rows, start=1):
            p = s.product
            price = p["price"]
            bg = SURFACE_2 if i % 2 else "transparent"
            cells: list[tuple[str, str | None]] = [(clip(p["name"], 26), None), (format_price(price), None)]
            if s.avg_cost is None:
                # Una sola celda a lo ancho, para no ensanchar la columna del costo.
                cells.append(("   sin compras cargadas: cargalas en la pestaña Stock", MUTED))
            else:
                cost = s.avg_cost
                m = margin(price, cost)
                cells += [(format_price(round(cost)), None), (format_price(round(price - cost)), None),
                          (pct(m), HEALTH[health(m)][1])]
                impacts = promo_impacts(p, self.promos)
                if impacts:
                    worst = impacts[0]
                    pm = margin(price * worst.factor, cost)
                    cells.append((f"{pct(pm)} ({worst.label})", HEALTH[health(pm)][1]))
                else:
                    cells.append(("—", MUTED))
                growth = self.inflation.between(s.cost_date or now, now)
                repo = cost * growth.factor
                cells += [(format_price(round(repo)) + ("*" if growth.estimated and self.inflation.available else ""), None),
                          (format_price(round(price - repo)), HEALTH["good"][1] if price > repo else HEALTH["low"][1])]
                cells.append((str(s.units), HEALTH["low"][1] if s.units <= 0 else None))
                ref = s.last_sale or s.last_purchase
                idle = (now - ref).days if ref else None
                cells.append((f"{idle} días" if idle is not None else "—", ACCENT if idle and idle > 60 else MUTED))
            for j, (text, color) in enumerate(cells):
                span = len(headers) - j if j == len(cells) - 1 else 1
                ctk.CTkLabel(self.table, text=text, text_color=color, fg_color=bg,
                             anchor="w" if j == 0 or span > 1 else "e", font=ctk.CTkFont(size=12))                     .grid(row=i, column=j, columnspan=span, sticky="ew", padx=0, ipadx=6)

    def _margin(self, s: ProductStock) -> float | None:
        return margin(s.product["price"], s.avg_cost) if s.avg_cost is not None else None

    # ---------- Simulador ----------
    def _build_simulator(self, body):
        box = ctk.CTkFrame(body, fg_color=SURFACE, corner_radius=10)
        box.grid(row=0, column=1, sticky="nsew")
        section_title(box, "Simulador: ¿a cuánto lo vendo?").pack(anchor="w", padx=14, pady=(12, 2))
        hint(box, "Poné lo que te cuesta y a cuánto lo pensás publicar (o el margen que querés ganar).") \
            .pack(anchor="w", padx=14)
        form = ctk.CTkFrame(box, fg_color="transparent")
        form.pack(fill="x", padx=14, pady=(8, 4))
        self.sim: dict[str, ctk.CTkEntry] = {}
        for j, (key, label, placeholder) in enumerate((("cost", "Costo ($)", "10000"), ("price", "Precio ($)", "20000"),
                                                       ("target", "o margen %", "40"))):
            ctk.CTkLabel(form, text=label, text_color=MUTED).grid(row=0, column=j, sticky="w", padx=(0, 8))
            entry = ctk.CTkEntry(form, width=110, placeholder_text=placeholder)
            entry.grid(row=1, column=j, sticky="w", padx=(0, 8))
            entry.bind("<KeyRelease>", lambda _e: self._simulate())
            self.sim[key] = entry
        self.sim_out = ctk.CTkTextbox(box, wrap="word", fg_color="transparent", font=ctk.CTkFont(size=13))
        self.sim_out.pack(fill="both", expand=True, padx=8, pady=(6, 10))
        self.sim_out.tag_config("good", foreground=HEALTH["good"][1])
        self.sim_out.tag_config("fair", foreground=HEALTH["fair"][1])
        self.sim_out.tag_config("low", foreground=HEALTH["low"][1])
        self.sim_out.tag_config("muted", foreground=MUTED)
        self.sim_out.tag_config("title", foreground=ACCENT)
        self._simulate()

    def _simulate(self):
        out = self.sim_out
        out.configure(state="normal")
        out.delete("1.0", "end")

        def write(text: str, tag: str | None = None):
            out.insert("end", text, tag)

        try:
            cost = parse_int(self.sim["cost"].get(), "El costo", allow_empty=True)
            price = parse_int(self.sim["price"].get(), "El precio", allow_empty=True)
            target = parse_int(self.sim["target"].get(), "El margen", allow_empty=True)
        except ValueError as exc:
            write(str(exc), "low")
            out.configure(state="disabled")
            return
        if not cost:
            write("Ejemplo: comprás un short a $10.000 y lo publicás a $20.000 → ganás $10.000 por unidad, "
                  "50 % de margen (saludable). Con un 3x2 vigente, quien lleva 3 paga $40.000 por $30.000 de costo: "
                  "el margen baja a 25 %.", "muted")
            out.configure(state="disabled")
            return
        if target and not price:
            if target >= 100:
                write("El margen tiene que ser menor a 100 %.", "low")
                out.configure(state="disabled")
                return
            price = price_for_margin(cost, target / 100)
            write(f"Para ganar {target} % del precio, publicalo a {format_price(price)}.\n\n", "title")
        if not price:
            write(f"Precio mínimo saludable ({pct(HEALTHY_MARGIN)}): {format_price(price_for_margin(cost, HEALTHY_MARGIN))}\n"
                  f"Precio mínimo justo ({pct(FAIR_MARGIN)}): {format_price(price_for_margin(cost, FAIR_MARGIN))}", None)
            out.configure(state="disabled")
            return

        m = margin(price, cost)
        state = health(m)
        write(f"Ganás {format_price(price - cost)} por unidad\n", "title")
        write(f"Margen {pct(m)} · markup {pct(markup(price, cost))} → ")
        write(HEALTH[state][0] + "\n", state)
        if state != "good":
            write(f"Para que sea saludable ({pct(HEALTHY_MARGIN)}), publicalo desde "
                  f"{format_price(price_for_margin(cost, HEALTHY_MARGIN))}.\n", "muted")

        if self.promos:
            write("\nCon las promos vigentes\n", "title")
            for impact in promo_impacts({"category_slug": None}, self.promos) or []:
                unit = price * impact.factor
                pm = margin(unit, cost)
                write(f"{impact.label} ({impact.detail}): cada unidad te deja {format_price(round(unit - cost))} → ")
                write(f"{pct(pm)} {HEALTH[health(pm)][0].lower()}\n", health(pm))
            write("(Las promos por categoría dependen del producto: miralas en la tabla.)\n", "muted")

        if self.inflation.available:
            write("\nInflación (proyectada con el último dato de INDEC)\n", "title")
            for months in (1, 3, 6):
                g = self.inflation.ahead(months)
                repo = cost * g.factor
                keep = price * g.factor
                real = price - repo
                write(f"En {months} {'mes' if months == 1 else 'meses'} ({pct(g.factor - 1, 1)}): reponerlo te costaría "
                      f"{format_price(round(repo))}. Si lo vendés a {format_price(price)} ganás en términos reales "
                      f"{format_price(round(real))}; para mantener tu ganancia tendrías que subirlo a "
                      f"{format_price(round(keep / 100) * 100)}.\n")
            write("Cuanto más tiempo queda en stock, más margen se come la inflación: si tarda en venderse, "
                  "actualizá el precio o armá una promo.", "muted")
        out.configure(state="disabled")
