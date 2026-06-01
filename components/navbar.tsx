"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/archive", label: "攻略归档" },
  { href: "/about", label: "关于我们" },
  { href: "/contact", label: "联系" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-12">
        <Link href="/" className="font-display text-lg tracking-[0.08em] text-[--ink-strong]">
          次元绅士指南
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm tracking-[0.1em] text-white/65 transition hover:bg-white/5 hover:text-[--ink-strong]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 sm:hidden"
          onClick={() => setOpen(!open)}
          aria-label="菜单"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            {open ? (
              <>
                <path d="M2 2L16 16M2 16L16 2" stroke="currentColor" strokeWidth="1.5" />
              </>
            ) : (
              <>
                <path d="M1 5H17M1 9H17M1 13H17" stroke="currentColor" strokeWidth="1.5" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 bg-black/80 px-5 py-4 backdrop-blur-xl sm:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-4 py-3 text-sm tracking-[0.1em] text-white/65 transition hover:bg-white/5 hover:text-[--ink-strong]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
