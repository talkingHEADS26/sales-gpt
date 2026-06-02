import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/TH_Logo.png";
const LOGO_WHITE_SRC = "/TH_Logo_white.png";

type SiteBrandProps = {
  href: string;
  className?: string;
  labelClassName?: string;
  markClassName?: string;
};

type SiteLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "default" | "white";
};

export function SiteLogo({ className, priority = false, variant = "default" }: SiteLogoProps) {
  return (
    <Image
      src={variant === "white" ? LOGO_WHITE_SRC : LOGO_SRC}
      alt="talkingHEADS Logo"
      width={320}
      height={152}
      priority={priority}
      className={className}
    />
  );
}

export function SiteBrand({
  href,
  className,
  markClassName,
}: SiteBrandProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center transition ${className ?? ""}`}
      aria-label="talkingHEADS Sales Trainer"
    >
      <SiteLogo className={`h-16 w-auto max-w-[360px] object-contain ${markClassName ?? ""}`} />
    </Link>
  );
}
