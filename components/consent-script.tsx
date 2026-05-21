"use client";

import { useId } from "react";
import Script, { type ScriptProps } from "next/script";

import { useConsent } from "@/components/consent-provider";
import type { OptionalConsentCategory } from "@/lib/consent";

type ConsentScriptProps = Omit<ScriptProps, "id"> & {
  category: OptionalConsentCategory;
  id?: string;
};

function logConsentDebug(message: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (payload === undefined) {
    console.debug(`[consent-script] ${message}`);
    return;
  }

  console.debug(`[consent-script] ${message}`, payload);
}

function buildScriptKey(id: string | undefined, src: ScriptProps["src"], fallbackId: string) {
  if (id) {
    return id;
  }

  if (typeof src === "string" && src.length > 0) {
    return src;
  }

  return fallbackId;
}

function hasExistingScript(scriptKey: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const scripts = document.querySelectorAll<HTMLScriptElement>(
    "script[data-consent-script-key]"
  );

  return Array.from(scripts).some(
    (scriptElement) => scriptElement.dataset.consentScriptKey === scriptKey
  );
}

function hasRenderableScriptSource(props: Omit<ConsentScriptProps, "category" | "id">) {
  if (typeof props.src === "string" && props.src.trim().length > 0) {
    return true;
  }

  if (typeof props.children === "string" && props.children.trim().length > 0) {
    return true;
  }

  return false;
}

export function ConsentScript({
  category,
  id,
  onReady,
  ...scriptProps
}: ConsentScriptProps) {
  const fallbackId = useId().replace(/:/g, "");
  const scriptKey = buildScriptKey(id, scriptProps.src, fallbackId);
  const { hasHydrated, hasConsentForCategory } = useConsent();

  if (!hasHydrated || !hasConsentForCategory(category)) {
    return null;
  }

  if (!hasRenderableScriptSource(scriptProps)) {
    logConsentDebug("skip-invalid-script-config", { category, scriptKey });
    return null;
  }

  if (hasExistingScript(scriptKey)) {
    logConsentDebug("skip-existing-script", { category, scriptKey });
    return null;
  }

  logConsentDebug("render-script", {
    category,
    scriptKey,
    src: scriptProps.src ?? "inline",
  });

  return (
    <Script
      {...scriptProps}
      id={id ?? `consent-script-${fallbackId}`}
      data-consent-script-key={scriptKey}
      onReady={() => {
        onReady?.();
      }}
    />
  );
}

type ConsentInlineScriptProps = {
  category: OptionalConsentCategory;
  scriptId: string;
  children: string;
};

export function ConsentInlineScript({
  category,
  scriptId,
  children,
}: ConsentInlineScriptProps) {
  return (
    <ConsentScript category={category} id={scriptId}>
      {children}
    </ConsentScript>
  );
}
