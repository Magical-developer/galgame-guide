"use client";

import { useEffect } from "react";

const POPUNDER_URL =
  "https://s.pemsrv.com/v1/link.php?cat=&idzone=5939330&type=8";

export function ExoClickHandler() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest(
        ".exoclick-popunder-trigger"
      ) as HTMLElement | null;
      if (!el) return;

      // Popunder: 打开广告窗口并把它推到后台，当前页面正常继续跳转
      const w = window.open(POPUNDER_URL, "_blank", "noopener,noreferrer");
      if (w) {
        try {
          w.blur();
          window.focus();
        } catch {
          /* noop */
        }
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return null;
}
