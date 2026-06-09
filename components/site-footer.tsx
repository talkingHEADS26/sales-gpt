"use client";

import Link from "next/link";

import { SiteLogo } from "@/components/site-brand";

const footerWebsiteLinks = [
  { label: "talkingHEADS Business", href: "https://talkingheads.business/" },
  { label: "talkingHEADS Consulting", href: "https://talkingheads.consulting/" },
  { label: "talkingHEADS Academy", href: "https://talkingheads.academy/" },
];

const footerLegalLinks = [
  { label: "Datenschutz", href: "https://talkingheads.business/datenschutz" },
  { label: "Impressum", href: "https://talkingheads.business/impressum" },
  { label: "AGB", href: "https://talkingheads.business/agb" },
];

const footerSocialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/talkingheadsdeutschland", icon: "facebook" },
  { label: "Instagram", href: "https://www.instagram.com/talkingheads_academy/?hl=de", icon: "instagram" },
  { label: "YouTube", href: "https://www.youtube.com/channel/UClkJA1h4oezrkgi9kpp8oqw", icon: "youtube" },
  { label: "TikTok", href: "https://www.tiktok.com/@talkingheads_academy", icon: "tiktok" },
  { label: "LinkedIn", href: "https://talkingheads.business/", icon: "linkedin" },
  { label: "Spotify", href: "https://talkingheads.business/", icon: "spotify" },
] as const;

function FooterSocialIcon({ name }: { name: (typeof footerSocialLinks)[number]["icon"] }) {
  switch (name) {
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M13.5 8.4h2.1V5.5H13.5c-1.8 0-3.1 1.4-3.1 3.4v1.7H8.2v2.8h2.2V19h3v-5.6h2.4l.5-2.8h-2.9V9c0-.4.3-.6.8-.6Z"
            fill="currentColor"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="16.6" cy="7.4" r="1.1" fill="currentColor" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="6.5" width="16" height="11" rx="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M10 9.3v5.4l4.8-2.7L10 9.3Z" fill="currentColor" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M13.8 5.5c.5 1.8 1.8 3.2 3.6 3.7v2.2c-1.2 0-2.4-.3-3.4-.9v4.8c0 2.5-2 4.4-4.5 4.4S5 18 5 15.5s2-4.4 4.5-4.4c.3 0 .5 0 .8.1v2.4a2.1 2.1 0 0 0-.8-.2 2.1 2.1 0 1 0 2.1 2.1V4.8h2.2v.7Z"
            fill="currentColor"
          />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6.3 8.4H4.1v11.1h2.2V8.4ZM5.2 4.5A1.3 1.3 0 1 0 5.2 7a1.3 1.3 0 0 0 0-2.5Zm5.7 3.9H8.7v11.1h2.2v-5.8c0-1.5.5-2.7 1.9-2.7 1.2 0 1.8.9 1.8 2.6v5.9h2.2v-6.4c0-3.3-1.8-4.9-4-4.9-1.4 0-2.3.8-2.9 1.7V8.4Z"
            fill="currentColor"
          />
        </svg>
      );
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M8 10.1c2.5-.6 5.5-.4 8 .6M8.7 12.5c2-.4 4.5-.3 6.3.5M9.2 14.8c1.5-.2 3.2 0 4.6.6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </svg>
      );
    default:
      return null;
  }
}

function FooterSocialLink({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: (typeof footerSocialLinks)[number]["icon"];
}) {
  return (
    <a className="footer-social" href={href} aria-label={label} target="_blank" rel="noopener noreferrer">
      <FooterSocialIcon name={icon} />
    </a>
  );
}

type SiteFooterProps = {
  brandHref?: string;
};

export function SiteFooter({ brandHref = "/landing" }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="landing-container footer-grid">
        <div>
          <Link href={brandHref} className="brand brand--footer" aria-label="talkingHEADS Startseite">
            <SiteLogo variant="white" className="brand__logo brand__logo--footer" />
          </Link>
          <address className="footer-contact">
            Geppert Consulting Group GmbH
            <br />
            Schnabelstr. 1, 45134 Essen
            <br />
            <a href="tel:020199950905">0201/99950905</a>
            <br />
            <a href="mailto:info@talkingheads.business">info@talkingheads.business</a>
          </address>
        </div>

        <div>
          <p className="footer-heading">WEBSEITEN</p>
          <ul className="footer-links">
            {footerWebsiteLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="footer-heading">LEGAL</p>
          <ul className="footer-links">
            {footerLegalLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="footer-heading">SOCIAL MEDIA</p>
          <div className="footer-socials" aria-label="Social Media">
            {footerSocialLinks.map((link) => (
              <FooterSocialLink key={link.label} label={link.label} href={link.href} icon={link.icon} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
