"use client";

import Link from "next/link";

import { openCookiePreferences } from "@/lib/consent";
import { legalNavigationLinks } from "@/lib/legal";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 text-sm text-slate-500 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium text-slate-500">AbschlussIO</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/faq" className="transition hover:text-[#0e51a0]">
              FAQ
            </Link>
            {legalNavigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-[#0e51a0]"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={openCookiePreferences}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-[#707070] shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition-colors hover:border-[#0e51a0]/25 hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
              aria-label="Cookie-Einstellungen öffnen"
            >
              Cookie-Einstellungen
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
