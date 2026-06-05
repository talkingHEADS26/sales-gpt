"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { SiteBrand } from "@/components/site-brand";

function MobileMenuOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[#0f172a]/28"
        aria-label="Navigation schließen"
      />

      <div className="fixed inset-y-0 right-0 z-50 h-full w-[80%] max-w-sm bg-white shadow-[-20px_0_48px_rgba(15,23,42,0.14)]">
        <div className="flex h-full flex-col px-4 py-4">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#707070] transition hover:border-[#0e51a0]/25 hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
              aria-label="Menü schließen"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4.5 w-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M6 6L18 18" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4">
            <Link
              href="/faq"
              onClick={onClose}
              className="rounded-[0.95rem] px-3 py-3 text-sm font-medium text-[#707070] transition hover:bg-slate-50 hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
            >
              FAQ
            </Link>
            <Link
              href="/login"
              onClick={onClose}
              className="rounded-[0.95rem] px-3 py-3 text-sm font-medium text-[#707070] transition hover:bg-slate-50 hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12"
            >
              Einloggen
            </Link>
            <a
              href="#pricing"
              onClick={onClose}
              className="th-reference-cta mt-2 w-full px-5 py-3 text-sm"
            >
              Kaufen!
            </a>
          </nav>
        </div>
      </div>
    </>,
    document.body
  );
}

type PublicSiteHeaderProps = {
  reducedEffects?: boolean;
};

export function PublicSiteHeader({
  reducedEffects = false,
}: PublicSiteHeaderProps = {}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header
        className={`rounded-[1.4rem] border px-3 py-2.5 sm:rounded-full sm:px-4 sm:py-3 md:px-6 ${
          reducedEffects
            ? "border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
            : "border-white/70 bg-white/75 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <SiteBrand
            href="/"
            className="gap-2"
            labelClassName="hidden sm:inline"
            markClassName="h-9 w-9 rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl"
          />

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#707070] shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition-colors hover:border-[#0e51a0]/25 hover:text-[#0e51a0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0e51a0]/12 sm:hidden"
            aria-label="Navigation öffnen"
            aria-expanded={isMobileMenuOpen}
            aria-controls="public-mobile-navigation"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4.5 w-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M4.5 7.5H19.5" />
              <path d="M4.5 12H19.5" />
              <path d="M4.5 16.5H19.5" />
            </svg>
          </button>

          <nav className="hidden items-center gap-2 sm:flex sm:gap-3">
            <Link
              href="/faq"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-[#707070] transition-colors hover:bg-slate-100 hover:text-[#0e51a0]"
            >
              FAQ
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-[#707070] transition-colors hover:bg-slate-100 hover:text-[#707070]"
            >
              Einloggen
            </Link>
            <a
              href="#pricing"
              className="th-reference-cta min-h-14 px-7 py-3 text-sm"
            >
              Kaufen!
            </a>
          </nav>
        </div>
      </header>

      <MobileMenuOverlay
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
