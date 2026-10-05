"""Componentes reutilizables del panel (CustomTkinter)."""

from __future__ import annotations

import io
import queue
import threading
from datetime import datetime
from tkinter import colorchooser, filedialog, messagebox
from typing import Any, Callable

import customtkinter as ctk
from PIL import Image

from db import AR_TZ, ApiError

# Colores de la marca (los mismos del sitio).
ACCENT = "#ff6a13"
ACCENT_HOVER = "#e85d0c"
VIOLET = "#8b3dff"
SURFACE = "#16141d"
SURFACE_2 = "#201c2b"
LINE = "#2c2738"
MUTED = "#9a93a8"
DANGER = "#ff4d4f"
OK = "#25d366"

IMAGE_TYPES = [("Imágenes", "*.jpg *.jpeg *.png *.webp"), ("Todos los archivos", "*.*")]


def primary_button(master, text: str, command, **kw) -> ctk.CTkButton:
    return ctk.CTkButton(master, text=text, command=command, fg_color=ACCENT, hover_color=ACCENT_HOVER,
                         text_color="#000", font=ctk.CTkFont(weight="bold"), **kw)


def ghost_button(master, text: str, command, **kw) -> ctk.CTkButton:
    return ctk.CTkButton(master, text=text, command=command, fg_color="transparent", border_width=1,
                         border_color=LINE, hover_color=SURFACE_2, **kw)


def danger_button(master, text: str, command, **kw) -> ctk.CTkButton:
    return ctk.CTkButton(master, text=text, command=command, fg_color="transparent", border_width=1,
                         border_color=DANGER, text_color=DANGER, hover_color="#3a1518", **kw)


def section_title(master, text: str) -> ctk.CTkLabel:
    return ctk.CTkLabel(master, text=text.upper(), text_color=ACCENT, font=ctk.CTkFont(size=12, weight="bold"), anchor="w")


def hint(master, text: str) -> ctk.CTkLabel:
    return ctk.CTkLabel(master, text=text, text_color=MUTED, font=ctk.CTkFont(size=11), anchor="w", justify="left", wraplength=520)


def parse_int(text: str, field: str, *, allow_empty: bool = False) -> int | None:
    value = text.strip().replace(".", "").replace("$", "").replace(" ", "")
    if not value:
        if allow_empty:
            return None
        raise ValueError(f"Completá {field}.")
    if not value.isdigit():
        raise ValueError(f"{field} tiene que ser un número entero (sin decimales).")
    return int(value)


def clip(text: str, length: int) -> str:
    return text if len(text) <= length else text[: length - 1] + "…"


def format_price(value: int | None) -> str:
    return "" if value is None else f"$ {value:,}".replace(",", ".")


# ---------- Tareas en segundo plano ----------
class Tasks:
    """Corre llamadas de red en hilos y devuelve el resultado al hilo de la ventana (Tk no es thread-safe)."""

    def __init__(self, root: ctk.CTk, on_busy: Callable[[bool], None]):
        self.root = root
        self.on_busy = on_busy
        self.results: queue.Queue = queue.Queue()
        self.running = 0
        root.after(50, self._poll)

    def run(self, fn: Callable[[], Any], ok: Callable[[Any], None] | None = None,
            error: Callable[[Exception], None] | None = None) -> None:
        self.running += 1
        self.on_busy(True)

        def worker():
            try:
                self.results.put((ok, fn(), None, error))
            except Exception as exc:  # noqa: BLE001 — se muestra al usuario
                self.results.put((ok, None, exc, error))

        threading.Thread(target=worker, daemon=True).start()

    def _poll(self):
        try:
            while True:
                ok, value, exc, error = self.results.get_nowait()
                self.running -= 1
                self.on_busy(self.running > 0)
                if exc is not None:
                    (error or show_error)(exc)
                elif ok:
                    ok(value)
        except queue.Empty:
            pass
        self.root.after(50, self._poll)


def show_error(exc: Exception) -> None:
    text = str(exc) if isinstance(exc, (ApiError, ValueError)) else f"Ocurrió un error inesperado:\n{exc}"
    messagebox.showerror("No se pudo completar", text)


# ---------- Miniaturas ----------
class ThumbCache:
    """Descarga y guarda miniaturas de URLs (o archivos locales) para no repetir pedidos."""

    def __init__(self, tasks: Tasks, fetch: Callable[[str], bytes]):
        self.tasks = tasks
        self.fetch = fetch
        self.images: dict[str, Image.Image] = {}
        self.waiting: dict[str, list[Callable[[Image.Image | None], None]]] = {}

    def get(self, source: str, callback: Callable[[Image.Image | None], None]) -> None:
        if source in self.images:
            callback(self.images[source])
            return
        if source in self.waiting:
            self.waiting[source].append(callback)
            return
        self.waiting[source] = [callback]

        def load():
            raw = self.fetch(source) if source.startswith("http") else open(source, "rb").read()
            img = Image.open(io.BytesIO(raw))
            img.thumbnail((240, 240))
            return img.convert("RGBA")

        def done(img):
            self.images[source] = img
            for cb in self.waiting.pop(source, []):
                cb(img)

        def fail(_exc):
            for cb in self.waiting.pop(source, []):
                cb(None)

        self.tasks.run(load, done, fail)


def square_image(img: Image.Image, size: int) -> ctk.CTkImage:
    w, h = img.size
    side = min(w, h)
    crop = img.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    return ctk.CTkImage(light_image=crop, dark_image=crop, size=(size, size))


# ---------- Tira de imágenes ----------
class ImageStrip(ctk.CTkFrame):
    """Imágenes de un producto o portada de una categoría.

    Cada ítem es una URL ya publicada o un archivo local que se sube recién al guardar
    (así no quedan fotos huérfanas en el bucket si se cancela la edición).
    """

    def __init__(self, master, thumbs: ThumbCache, *, single: bool = False, size: int = 96):
        super().__init__(master, fg_color="transparent")
        self.thumbs = thumbs
        self.single = single
        self.size = size
        self.items: list[str] = []  # URL (http…) o ruta local
        self.row = ctk.CTkFrame(self, fg_color="transparent")
        self.row.pack(fill="x")
        bar = ctk.CTkFrame(self, fg_color="transparent")
        bar.pack(fill="x", pady=(6, 0))
        ghost_button(bar, "Cambiar foto…" if single else "Subir fotos…", self._pick_files, width=130).pack(side="left")
        ghost_button(bar, "Pegar link", self._paste_link, width=100).pack(side="left", padx=6)
        if not single:
            hint(bar, "La primera es la foto principal.").pack(side="left", padx=6)

    def set(self, items: list[str]) -> None:
        self.items = list(items)
        self._render()

    def get(self) -> list[str]:
        return list(self.items)

    def _pick_files(self):
        if self.single:
            path = filedialog.askopenfilename(title="Elegí una imagen", filetypes=IMAGE_TYPES)
            if path:
                self.set([path])
        else:
            paths = filedialog.askopenfilenames(title="Elegí una o varias imágenes", filetypes=IMAGE_TYPES)
            if paths:
                self.set(self.items + list(paths))

    def _paste_link(self):
        url = ctk.CTkInputDialog(title="Pegar link", text="URL de la imagen (https://…)").get_input()
        if not url:
            return
        url = url.strip()
        if not url.startswith("https://"):
            messagebox.showwarning("Link no válido", "El link tiene que empezar con https://")
            return
        self.set([url] if self.single else self.items + [url])

    def _move(self, index: int, step: int):
        j = index + step
        if 0 <= j < len(self.items):
            self.items[index], self.items[j] = self.items[j], self.items[index]
            self._render()

    def _remove(self, index: int):
        del self.items[index]
        self._render()

    def _render(self):
        for child in self.row.winfo_children():
            child.destroy()
        if not self.items:
            hint(self.row, "Sin imágenes todavía.").pack(anchor="w")
            return
        for i, source in enumerate(self.items):
            card = ctk.CTkFrame(self.row, fg_color=SURFACE_2, corner_radius=8, border_width=2,
                                border_color=ACCENT if i == 0 and not self.single else SURFACE_2)
            card.pack(side="left", padx=(0, 8))
            pic = ctk.CTkLabel(card, text="…", width=self.size, height=self.size, fg_color=SURFACE, corner_radius=6)
            pic.pack(padx=4, pady=(4, 2))
            self._load_into(pic, source)
            tag = "NUEVA" if not source.startswith("http") else ("PRINCIPAL" if i == 0 and not self.single else "")
            if tag:
                ctk.CTkLabel(card, text=tag, font=ctk.CTkFont(size=9, weight="bold"),
                             text_color=ACCENT if tag == "PRINCIPAL" else OK).pack()
            if not self.single:
                tools = ctk.CTkFrame(card, fg_color="transparent")
                tools.pack(pady=(0, 4))
                for text, cmd in (("◀", lambda i=i: self._move(i, -1)), ("✕", lambda i=i: self._remove(i)),
                                  ("▶", lambda i=i: self._move(i, 1))):
                    ctk.CTkButton(tools, text=text, width=28, height=24, fg_color="transparent", hover_color=LINE,
                                  text_color=DANGER if text == "✕" else None, command=cmd).pack(side="left")

    def _load_into(self, label: ctk.CTkLabel, source: str):
        def show(img):
            if not label.winfo_exists():
                return
            if img is None:
                label.configure(text="sin vista\nprevia", font=ctk.CTkFont(size=10))
            else:
                label.configure(image=square_image(img, self.size), text="")

        self.thumbs.get(source, show)


# ---------- Colores ----------
class ColorList(ctk.CTkFrame):
    """Lista editable de colores {name, hex}."""

    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self.rows_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.rows_frame.pack(fill="x")
        self.rows: list[tuple[ctk.CTkFrame, ctk.CTkEntry, ctk.CTkButton, list[str]]] = []
        ghost_button(self, "+ Agregar color", lambda: self._add_row("", "#111111"), width=140).pack(anchor="w", pady=(4, 0))

    def set(self, colors: list[dict[str, str]]):
        for frame, *_ in self.rows:
            frame.destroy()
        self.rows = []
        for c in colors:
            self._add_row(c.get("name", ""), c.get("hex", "#111111"))

    def get(self) -> list[dict[str, str]]:
        out = []
        for _frame, name, _swatch, hex_ref in self.rows:
            if name.get().strip():
                out.append({"name": name.get().strip(), "hex": hex_ref[0]})
        return out

    def _add_row(self, name: str, hex_value: str):
        frame = ctk.CTkFrame(self.rows_frame, fg_color="transparent")
        frame.pack(fill="x", pady=2)
        hex_ref = [hex_value]
        swatch = ctk.CTkButton(frame, text="", width=32, height=28, fg_color=hex_value, hover_color=hex_value,
                               border_width=1, border_color=LINE)
        swatch.pack(side="left")
        entry = ctk.CTkEntry(frame, placeholder_text="Nombre (ej. Negro)", width=200)
        entry.insert(0, name)
        entry.pack(side="left", padx=6)
        code = ctk.CTkLabel(frame, text=hex_value, text_color=MUTED, width=70)
        code.pack(side="left")

        def pick():
            _, chosen = colorchooser.askcolor(color=hex_ref[0], title="Elegí el color")
            if chosen:
                hex_ref[0] = chosen
                swatch.configure(fg_color=chosen, hover_color=chosen)
                code.configure(text=chosen)

        swatch.configure(command=pick)
        row = (frame, entry, swatch, hex_ref)

        def remove():
            frame.destroy()
            self.rows.remove(row)

        ctk.CTkButton(frame, text="✕", width=28, fg_color="transparent", hover_color=LINE, text_color=DANGER,
                      command=remove).pack(side="left", padx=4)
        self.rows.append(row)


# ---------- Fecha y hora (Argentina) ----------
class DateTimeEntry(ctk.CTkFrame):
    """Fecha y hora en hora argentina con formato dd/mm/aaaa hh:mm."""

    FORMAT = "%d/%m/%Y %H:%M"

    def __init__(self, master, width: int = 160):
        super().__init__(master, fg_color="transparent")
        self.entry = ctk.CTkEntry(self, width=width, placeholder_text="dd/mm/aaaa hh:mm")
        self.entry.pack(side="left")
        ghost_button(self, "Ahora", lambda: self.set(datetime.now(AR_TZ)), width=64).pack(side="left", padx=6)

    def set(self, value: datetime | None):
        self.entry.delete(0, "end")
        if value:
            self.entry.insert(0, value.astimezone(AR_TZ).strftime(self.FORMAT))

    def get(self, field: str) -> datetime:
        text = self.entry.get().strip()
        try:
            return datetime.strptime(text, self.FORMAT).replace(tzinfo=AR_TZ)
        except ValueError:
            raise ValueError(f"{field}: usá el formato dd/mm/aaaa hh:mm (ej. 01/11/2026 00:00).") from None


# ---------- Lista lateral con buscador ----------
class ListPanel(ctk.CTkFrame):
    """Columna izquierda: buscador + lista seleccionable (con miniatura opcional)."""

    def __init__(self, master, on_select: Callable[[str], None], thumbs: ThumbCache | None = None,
                 placeholder: str = "Buscar…", extra: Callable[[ctk.CTkFrame], None] | None = None):
        super().__init__(master, fg_color=SURFACE, corner_radius=10, width=330)
        self.on_select = on_select
        self.thumbs = thumbs
        self.items: list[dict[str, Any]] = []
        self.buttons: dict[str, ctk.CTkButton] = {}
        self.selected: str | None = None
        self.search = ctk.CTkEntry(self, placeholder_text=placeholder)
        self.search.pack(fill="x", padx=10, pady=(10, 6))
        self.search.bind("<KeyRelease>", lambda _e: self._render())
        if extra:
            box = ctk.CTkFrame(self, fg_color="transparent", height=0)
            extra(box)
            if box.winfo_children():
                box.pack(fill="x", padx=10)
            else:
                box.destroy()
        self.count = ctk.CTkLabel(self, text="", text_color=MUTED, font=ctk.CTkFont(size=11), anchor="w")
        self.count.pack(fill="x", padx=12)
        self.list = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.list.pack(fill="both", expand=True, padx=4, pady=(0, 8))

    def set_items(self, items: list[dict[str, Any]]):
        """items: {id, title, subtitle, search, image?, dim?}"""
        self.items = items
        self._render()

    def select(self, item_id: str | None):
        self.selected = item_id
        for key, button in self.buttons.items():
            button.configure(fg_color=SURFACE_2 if key == item_id else "transparent",
                             border_color=ACCENT if key == item_id else SURFACE)

    def _render(self):
        for child in self.list.winfo_children():
            child.destroy()
        self.buttons = {}
        query = self.search.get().strip().lower()
        shown = [it for it in self.items if all(t in it["search"].lower() for t in query.split())]
        self.count.configure(text=f"{len(shown)} de {len(self.items)}")
        for it in shown:
            button = ctk.CTkButton(
                self.list, text=f"{clip(it['title'], 26)}\n{clip(it['subtitle'], 32)}", anchor="w",
                height=56 if self.thumbs else 48,
                fg_color="transparent", hover_color=SURFACE_2, border_width=1, border_color=SURFACE,
                text_color=MUTED if it.get("dim") else None, compound="left",
                command=lambda i=it["id"]: self.on_select(i),
            )
            button.pack(fill="x", pady=1)
            button._text_label.configure(justify="left")  # dos líneas alineadas a la izquierda
            self.buttons[it["id"]] = button
            if self.thumbs and it.get("image"):
                self.thumbs.get(it["image"], lambda img, b=button: b.winfo_exists() and img is not None
                                and b.configure(image=square_image(img, 44)))
        self.select(self.selected)


class Form(ctk.CTkScrollableFrame):
    """Formulario de dos columnas: etiqueta a la izquierda, control a la derecha."""

    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self.grid_columnconfigure(1, weight=1)
        self.r = 0

    def title(self, text: str):
        section_title(self, text).grid(row=self.r, column=0, columnspan=2, sticky="w", pady=(16, 4))
        self.r += 1

    def add(self, label: str, widget, note: str | None = None, sticky: str = "w"):
        ctk.CTkLabel(self, text=label, anchor="w").grid(row=self.r, column=0, sticky="nw", padx=(0, 12), pady=6)
        widget.grid(row=self.r, column=1, sticky=sticky, pady=6)
        self.r += 1
        if note:
            hint(self, note).grid(row=self.r, column=1, sticky="w", pady=(0, 4))
            self.r += 1
        return widget

    def full(self, widget, sticky: str = "ew"):
        widget.grid(row=self.r, column=0, columnspan=2, sticky=sticky, pady=6)
        self.r += 1
        return widget


def set_entry(entry: ctk.CTkEntry | ctk.CTkTextbox, value: Any):
    if isinstance(entry, ctk.CTkTextbox):
        entry.delete("1.0", "end")
        entry.insert("1.0", "" if value is None else str(value))
    else:
        state = entry.cget("state")
        entry.configure(state="normal")
        entry.delete(0, "end")
        entry.insert(0, "" if value is None else str(value))
        entry.configure(state=state)


def get_text(widget: ctk.CTkTextbox) -> str:
    return widget.get("1.0", "end").strip()
