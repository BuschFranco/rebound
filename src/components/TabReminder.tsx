"use client";

import { useEffect } from "react";

const MESSAGES = ["¡No te lo pierdas!", "¡Volvé al juego!"];
/** Cuánto espera desde que el usuario deja la pestaña hasta mostrar el primer mensaje. */
const START_DELAY_MS = 2000;
const INTERVAL_MS = 2000;

/** Cuando el usuario cambia de pestaña, el título alterna mensajes para invitarlo a volver. */
export function TabReminder() {
  useEffect(() => {
    let original = document.title;
    let delay: number | undefined;
    let timer: number | undefined;

    function stop() {
      window.clearTimeout(delay);
      delay = undefined;
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
      document.title = original;
    }

    function start() {
      original = document.title;
      let i = 0;
      document.title = MESSAGES[0];
      timer = window.setInterval(() => {
        i = (i + 1) % MESSAGES.length;
        document.title = MESSAGES[i];
      }, INTERVAL_MS);
    }

    function onVisibilityChange() {
      stop();
      if (document.hidden) delay = window.setTimeout(start, START_DELAY_MS);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, []);

  return null;
}
