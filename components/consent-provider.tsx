"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { CookieBanner } from "@/components/cookie-banner";
import { CookiePreferencesModal } from "@/components/cookie-preferences-modal";
import {
  CONSENT_OPEN_EVENT,
  getDefaultConsentPreferences,
  getStoredConsentSnapshot,
  getStoredConsentServerSnapshot,
  hasConsentForCategory,
  installConsentDebugHelpers,
  removeConsentDebugHelpers,
  resetStoredConsent,
  saveConsentPreferences,
  subscribeToConsentStore,
  type ConsentCategory,
  type ConsentPreferences,
  type ConsentState,
  type OptionalConsentCategory,
} from "@/lib/consent";

type ConsentContextValue = {
  consent: ConsentState | null;
  hasHydrated: boolean;
  openPreferences: () => void;
  resetConsent: () => void;
  hasConsentForCategory: (category: ConsentCategory) => boolean;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);
const emptySubscribe = () => () => {};

type ConsentProviderProps = {
  children: ReactNode;
};

function getClientSnapshot() {
  return getStoredConsentSnapshot();
}

function logConsentDebug(message: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (payload === undefined) {
    console.debug(`[consent-provider] ${message}`);
    return;
  }

  console.debug(`[consent-provider] ${message}`, payload);
}

export function ConsentProvider({ children }: ConsentProviderProps) {
  const consent = useSyncExternalStore(
    subscribeToConsentStore,
    getClientSnapshot,
    getStoredConsentServerSnapshot
  );
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState<ConsentPreferences>(
    () => consent?.preferences ?? getDefaultConsentPreferences()
  );

  useEffect(() => {
    installConsentDebugHelpers();

    return () => {
      removeConsentDebugHelpers();
    };
  }, []);

  useEffect(() => {
    const handleOpenPreferences = () => {
      setDraftPreferences(consent?.preferences ?? getDefaultConsentPreferences());
      setIsPreferencesOpen(true);
    };

    window.addEventListener(CONSENT_OPEN_EVENT, handleOpenPreferences);

    return () => {
      window.removeEventListener(CONSENT_OPEN_EVENT, handleOpenPreferences);
    };
  }, [consent]);

  const persistConsent = (preferences: ConsentPreferences) => {
    logConsentDebug("persist-consent", preferences);
    saveConsentPreferences(preferences);
    setDraftPreferences({
      necessary: true,
      statistics: preferences.statistics,
      marketing: preferences.marketing,
    });
    setIsPreferencesOpen(false);
  };

  const handleAcceptAll = () => {
    logConsentDebug("accept-all-clicked");
    persistConsent({
      necessary: true,
      statistics: true,
      marketing: true,
    });
  };

  const handleAcceptNecessary = () => {
    logConsentDebug("accept-necessary-clicked");
    persistConsent(getDefaultConsentPreferences());
  };

  const handleSavePreferences = () => {
    persistConsent(draftPreferences);
  };

  const handlePreferenceChange = (
    category: OptionalConsentCategory,
    value: boolean
  ) => {
    setDraftPreferences((currentValue) => ({
      ...currentValue,
      [category]: value,
    }));
  };

  const handleOpenPreferences = () => {
    logConsentDebug("open-preferences", consent?.preferences ?? null);
    setDraftPreferences(consent?.preferences ?? getDefaultConsentPreferences());
    setIsPreferencesOpen(true);
  };

  const handleClosePreferences = () => {
    setDraftPreferences(consent?.preferences ?? getDefaultConsentPreferences());
    setIsPreferencesOpen(false);
  };

  const handleResetConsent = () => {
    logConsentDebug("reset-consent");
    resetStoredConsent();
    setDraftPreferences(getDefaultConsentPreferences());
    setIsPreferencesOpen(true);
  };

  const contextValue: ConsentContextValue = {
    consent,
    hasHydrated,
    openPreferences: handleOpenPreferences,
    resetConsent: handleResetConsent,
    hasConsentForCategory: (category: ConsentCategory) =>
      hasConsentForCategory(consent, category),
  };

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}
      <div>
        {hasHydrated && !consent ? (
          <CookieBanner
            onAcceptAll={handleAcceptAll}
            onAcceptNecessary={handleAcceptNecessary}
            onOpenPreferences={handleOpenPreferences}
          />
        ) : null}

        <CookiePreferencesModal
          draftPreferences={draftPreferences}
          isEditable={Boolean(consent)}
          isOpen={isPreferencesOpen}
          onAcceptAll={handleAcceptAll}
          onAcceptNecessary={handleAcceptNecessary}
          onChange={handlePreferenceChange}
          onClose={handleClosePreferences}
          onReset={handleResetConsent}
          onSave={handleSavePreferences}
        />
      </div>
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);

  if (!context) {
    throw new Error("useConsent must be used within a ConsentProvider.");
  }

  return context;
}
