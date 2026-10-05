"""Pantalla base: lista a la izquierda, formulario a la derecha y botones Guardar / Nuevo / Eliminar."""

from __future__ import annotations

from tkinter import messagebox
from typing import TYPE_CHECKING, Any

import customtkinter as ctk

from widgets import Form, ListPanel, danger_button, ghost_button, primary_button, show_error

if TYPE_CHECKING:
    from app import AdminApp


class Cancelled(Exception):
    """El usuario decidió no guardar (no se muestra error)."""


class EditorView(ctk.CTkFrame):
    #: Nombre en singular para los mensajes ("producto", "categoría"…).
    noun = "registro"
    #: Género del sustantivo para "Nuevo/Nueva".
    feminine = False
    #: Clave primaria de la tabla.
    key = "id"
    #: Mostrar miniaturas en la lista.
    list_thumbs = False
    list_placeholder = "Buscar…"

    def __init__(self, master, app: "AdminApp"):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.api = app.api
        self.records: list[dict[str, Any]] = []
        self.current: dict[str, Any] | None = None

        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.list = ListPanel(self, self.select, app.thumbs if self.list_thumbs else None,
                              self.list_placeholder, extra=self.build_list_extra)
        self.list.grid(row=0, column=0, sticky="ns", padx=(0, 12))
        self.list.grid_propagate(False)

        right = ctk.CTkFrame(self, fg_color="transparent")
        right.grid(row=0, column=1, sticky="nsew")
        right.grid_rowconfigure(1, weight=1)
        right.grid_columnconfigure(0, weight=1)

        self.heading = ctk.CTkLabel(right, text="", font=ctk.CTkFont(size=22, weight="bold"), anchor="w")
        self.heading.grid(row=0, column=0, sticky="ew", pady=(0, 4))
        self.form = Form(right)
        self.form.grid(row=1, column=0, sticky="nsew")
        self.build_form(self.form)

        bar = ctk.CTkFrame(right, fg_color="transparent")
        bar.grid(row=2, column=0, sticky="ew", pady=(10, 0))
        self.save_button = primary_button(bar, "Guardar", self.save, width=140)
        self.save_button.pack(side="right")
        ghost_button(bar, "Nueva" if self.feminine else "Nuevo", self.new, width=110).pack(side="right", padx=8)
        self.delete_button = danger_button(bar, "Eliminar", self.ask_delete, width=110)
        self.delete_button.pack(side="left")
        self.build_extra_buttons(bar)

        self.new()

    # ---------- Para redefinir ----------
    def build_list_extra(self, box: ctk.CTkFrame) -> None: ...
    def build_extra_buttons(self, bar: ctk.CTkFrame) -> None: ...
    def build_form(self, form: Form) -> None: raise NotImplementedError
    def fetch(self) -> list[dict[str, Any]]: raise NotImplementedError
    def to_items(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]: raise NotImplementedError
    def fill(self, record: dict[str, Any] | None) -> None: raise NotImplementedError
    def title_of(self, record: dict[str, Any]) -> str: return str(record.get(self.key))

    def collect(self) -> dict[str, Any]:
        """Lee y valida el formulario (en el hilo de la ventana). ValueError = mensaje para el usuario."""
        raise NotImplementedError

    def persist(self, values: dict[str, Any]) -> str:
        """Guarda en la base (en segundo plano). Devuelve la clave del registro guardado."""
        raise NotImplementedError

    def remove(self, record: dict[str, Any]) -> None:
        """Elimina en la base (en segundo plano)."""
        self.api.delete(self.table, {self.key: record[self.key]})

    def check_delete(self, record: dict[str, Any]) -> str | None:
        """Devuelve un motivo para bloquear el borrado (en segundo plano), o None."""
        return None

    table = ""

    # ---------- Flujo común ----------
    def load(self, select: str | None = None) -> None:
        def done(records):
            self.records = records
            self.list.set_items(self.to_items(records))
            target = select if select is not None else (self.current or {}).get(self.key)
            if target and any(r[self.key] == target for r in records):
                self.select(target)
            elif select is not None or self.current is not None:
                self.new()

        self.app.tasks.run(self.fetch, done)

    def select(self, key: str) -> None:
        record = next((r for r in self.records if r[self.key] == key), None)
        if record is None:
            return
        self.current = record
        self.list.select(key)
        self.heading.configure(text=self.title_of(record))
        self.delete_button.configure(state="normal")
        self.fill(record)

    def new(self) -> None:
        self.current = None
        self.list.select(None)
        self.heading.configure(text=f"{'Nueva' if self.feminine else 'Nuevo'} {self.noun}")
        self.delete_button.configure(state="disabled")
        self.fill(None)
        self.form._parent_canvas.yview_moveto(0)

    def save(self) -> None:
        try:
            values = self.collect()
        except Cancelled:
            return
        except ValueError as exc:
            show_error(exc)
            return
        self.save_button.configure(state="disabled", text="Guardando…")

        def work():
            key = self.persist(values)
            return key, self.api.revalidate_site()

        def done(result):
            key, revalidated = result
            self.save_button.configure(state="normal", text="Guardar")
            self.app.changed(self, f"{self.noun.capitalize()} guardad{'a' if self.feminine else 'o'}", revalidated)
            self.load(select=key)

        def fail(exc):
            self.save_button.configure(state="normal", text="Guardar")
            show_error(exc)

        self.app.tasks.run(work, done, fail)

    def ask_delete(self) -> None:
        record = self.current
        if record is None:
            return

        def checked(reason):
            if reason:
                messagebox.showwarning("No se puede eliminar", reason)
                return
            if not self.confirm_delete(record):
                return
            self.app.tasks.run(lambda: (self.remove(record), self.api.revalidate_site())[1], deleted)

        def deleted(revalidated):
            self.app.changed(self, f"{self.noun.capitalize()} eliminad{'a' if self.feminine else 'o'}", revalidated)
            self.current = None
            self.load()
            self.new()

        self.app.tasks.run(lambda: self.check_delete(record), checked)

    def confirm_delete(self, record: dict[str, Any]) -> bool:
        return messagebox.askyesno(
            "Eliminar", f"¿Eliminar {'la' if self.feminine else 'el'} {self.noun} “{self.title_of(record)}”?\n"
                        "Esta acción no se puede deshacer.", icon="warning")
