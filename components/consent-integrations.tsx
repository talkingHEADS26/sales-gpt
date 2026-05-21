"use client";

import { ConsentInlineScript, ConsentScript } from "@/components/consent-script";

type AnalyticsIntegrationsProps = {
  gaMeasurementId?: string;
  metaPixelId?: string;
};

function logConsentDebug(message: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (payload === undefined) {
    console.debug(`[consent-integrations] ${message}`);
    return;
  }

  console.debug(`[consent-integrations] ${message}`, payload);
}

function isValidGaMeasurementId(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue === "G-XXXXXXXXXX") {
    return false;
  }

  return /^G-[A-Z0-9]+$/i.test(normalizedValue);
}

function isValidMetaPixelId(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue === "META_PIXEL_ID") {
    return false;
  }

  return /^\d{8,32}$/.test(normalizedValue);
}

export function ConsentIntegrations({
  gaMeasurementId,
  metaPixelId,
}: AnalyticsIntegrationsProps) {
  const resolvedGaMeasurementId =
    gaMeasurementId ?? process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const resolvedMetaPixelId =
    metaPixelId ?? process.env.NEXT_PUBLIC_META_PIXEL_ID;

  const hasGaMeasurementId = isValidGaMeasurementId(resolvedGaMeasurementId);
  const hasMetaPixelId = isValidMetaPixelId(resolvedMetaPixelId);

  if (process.env.NODE_ENV === "development") {
    logConsentDebug("integration-config", {
      ga4: hasGaMeasurementId ? resolvedGaMeasurementId : null,
      metaPixel: hasMetaPixelId ? resolvedMetaPixelId : null,
    });
  }

  return (
    <>
      {hasGaMeasurementId ? (
        <>
          <ConsentScript
            category="statistics"
            id="ga4-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${resolvedGaMeasurementId.trim()}`}
            strategy="afterInteractive"
          />
          <ConsentInlineScript category="statistics" scriptId="ga4-init">
            {`
              window.dataLayer = window.dataLayer || [];
              window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
              window.gtag('js', new Date());
              window.gtag('config', '${resolvedGaMeasurementId.trim()}', { anonymize_ip: true });
            `}
          </ConsentInlineScript>
        </>
      ) : null}

      {hasMetaPixelId ? (
        <ConsentInlineScript category="marketing" scriptId="meta-pixel-init">
          {`
            !(function(f,b,e,v,n,t,s){
              if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s);
            })(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            if (typeof window.fbq === 'function') {
              window.fbq('init', '${resolvedMetaPixelId.trim()}');
              window.fbq('track', 'PageView');
            }
          `}
        </ConsentInlineScript>
      ) : null}
    </>
  );
}
