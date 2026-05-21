import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { SiteBrand } from "@/components/site-brand";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

type LegalPageShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function LegalPageShell({
  children,
  eyebrow,
  title,
  description,
}: LegalPageShellProps) {
  return (
    <main
      className={`${plusJakartaSans.className} min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#dcecff_0%,#f7fbff_38%,#f6f8fc_72%,#eef3f9_100%)] text-[#707070]`}
    >
      <div className="relative isolate min-h-screen">
        <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[linear-gradient(135deg,rgba(14,81,160,0.18),rgba(14,81,160,0.03)_46%,rgba(255,255,255,0)_72%)]" />
        <div className="absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#0e51a0]/12 blur-3xl" />

        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between rounded-full border border-white/70 bg-white/75 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur md:px-6">
            <SiteBrand href="/" />
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-[#707070] transition hover:bg-slate-100 hover:text-[#0e51a0]"
            >
              Zur Startseite
            </Link>
          </header>

          <section className="flex flex-1 items-center py-10 sm:py-14 lg:py-18">
            <div className="w-full rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6 lg:p-8">
              <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
                  {eyebrow}
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[#707070] sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  {description}
                </p>

                <div className="mt-8 space-y-4">{children}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
