"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

/** Inline before paint: apply the saved theme to avoid a flash. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('zs-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

const EVENT = "zs-theme";
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("zs-theme", next);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
      className="grid size-11 flex-none place-items-center rounded-full hover:bg-[var(--surface-2)]"
    >
      {dark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
    </button>
  );
}
