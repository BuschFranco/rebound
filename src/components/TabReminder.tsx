"use client";

import { useEffect } from "react";

const MESSAGES = ["¡No te lo pierdas!", "¡Volvé al juego!"];
const INTERVAL_MS = 2000;

/** Cuando el usuario cambia de pestaña, el título alterna mensajes para invitarlo a volver. */
export function TabReminder() {
  useEffect(() => {
    let original = document.title;
    let timer: number | undefined;

    function stop() {
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
      document.title = original;
    }

    function onVisibilityChange() {
      if (document.hidden) {
        original = document.title;
        let i = 0;
        document.title = MESSAGES[0];
        timer = window.setInterval(() => {
          i = (i + 1) % MESSAGES.length;
          document.title = MESSAGES[i];
        }, INTERVAL_MS);
      } else {
        stop();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, []);

  return null;
}
