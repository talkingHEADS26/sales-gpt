import Link from "next/link";

type SiteBrandProps = {
  href: string;
  className?: string;
  labelClassName?: string;
  markClassName?: string;
};

export function SiteBrand({
  href,
  className,
  labelClassName,
  markClassName,
}: SiteBrandProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-3 text-[#707070] transition hover:text-[#0e51a0] ${className ?? ""}`}
      aria-label="AbschlussIO"
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#0e51a0]/14 bg-[linear-gradient(180deg,rgba(14,81,160,0.12),rgba(255,255,255,0.98))] shadow-[0_12px_30px_rgba(14,81,160,0.14)] ${markClassName ?? ""}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 48 48"
          className="h-7 w-7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6.5 35.5L18.2 10.5L29.7 35.5H23.8L18.3 22.3L12.5 35.5H6.5Z"
            fill="#123D74"
          />
          <path
            d="M11.6 31.6C18.1 24.6 25.2 21.6 32.8 22.7C36.5 23.3 39.3 24.8 41.6 27.2"
            stroke="#1FA2FF"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M34.5 10.6C29.3 10.6 25 14.9 25 20.1V27.9C25 33.1 29.3 37.4 34.5 37.4C39.7 37.4 44 33.1 44 27.9V20.1C44 14.9 39.7 10.6 34.5 10.6ZM34.5 14.8C37.4 14.8 39.8 17.2 39.8 20.1V27.9C39.8 30.8 37.4 33.2 34.5 33.2C31.6 33.2 29.2 30.8 29.2 27.9V20.1C29.2 17.2 31.6 14.8 34.5 14.8Z"
            fill="#295FA8"
          />
          <circle cx="34.5" cy="19.5" r="2.3" fill="#123D74" />
          <path
            d="M32.2 24.4C32.2 23.7 32.8 23.1 33.5 23.1H35.5C36.2 23.1 36.8 23.7 36.8 24.4V31.1H32.2V24.4Z"
            fill="#1FA2FF"
          />
        </svg>
      </span>

      <span
        className={`text-sm font-semibold uppercase tracking-[0.18em] ${labelClassName ?? ""}`}
      >
        Abschluss<span className="text-[#0e51a0]">IO</span>
      </span>
    </Link>
  );
}
