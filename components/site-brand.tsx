import Image from "next/image";
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
      aria-label="talkingHEADS Sales Trainer"
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-[#0e51a0]/14 bg-white shadow-[0_12px_30px_rgba(14,81,160,0.14)] ${markClassName ?? ""}`}
        aria-hidden="true"
      >
        <Image
          src="/th_icon.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 object-cover"
        />
      </span>

      <span
        className={`text-sm font-semibold uppercase tracking-[0.18em] ${labelClassName ?? ""}`}
      >
        talkingHEADS Sales Trainer
      </span>
    </Link>
  );
}
