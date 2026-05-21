export const CONSENT_STORAGE_KEY = "abschlussio-cookie-consent";
export const CONSENT_STORAGE_VERSION = 1;
export const CONSENT_OPEN_EVENT = "cookie-consent:open";
export const CONSENT_UPDATED_EVENT = "cookie-consent:updated";

export type ConsentCategory = "necessary" | "statistics" | "marketing";
export type OptionalConsentCategory = Exclude<ConsentCategory, "necessary">;

export type ConsentPreferences = {
  necessary: true;
  statistics: boolean;
  marketing: boolean;
};

export type ConsentState = {
  version: number;
  savedAt: string;
  preferences: ConsentPreferences;
};

type ConsentListener = () => void;
type ConsentDebugApi = {
  open: () => void;
  read: () => ConsentState | null;
  reset: () => void;
};

declare global {
  interface Window {
    __abschlussioConsentDebug?: ConsentDebugApi;
  }
}

const defaultConsentPreferences: ConsentPreferences = {
  necessary: true,
  statistics: false,
  marketing: false,
};

const consentListeners = new Set<ConsentListener>();
const serverConsentSnapshot: ConsentState | null = null;

let currentConsentSnapshot: ConsentState | null = null;
let hasInitializedConsentSnapshot = false;
let hasAttachedBrowserListeners = false;

function logConsentDebug(message: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (payload === undefined) {
    console.debug(`[consent] ${message}`);
    return;
  }

  console.debug(`[consent] ${message}`, payload);
}

export function getDefaultConsentPreferences(): ConsentPreferences {
  return { ...defaultConsentPreferences };
}

export function createConsentState(
  preferences: Partial<Omit<ConsentPreferences, "necessary">> = {}
): ConsentState {
  return {
    version: CONSENT_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    preferences: {
      necessary: true,
      statistics: preferences.statistics ?? false,
      marketing: preferences.marketing ?? false,
    },
  };
}

function isConsentState(value: unknown): value is ConsentState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ConsentState>;

  return (
    candidate.version === CONSENT_STORAGE_VERSION &&
    typeof candidate.savedAt === "string" &&
    Boolean(candidate.preferences) &&
    candidate.preferences?.necessary === true &&
    typeof candidate.preferences?.statistics === "boolean" &&
    typeof candidate.preferences?.marketing === "boolean"
  );
}

function areConsentStatesEqual(
  left: ConsentState | null,
  right: ConsentState | null
) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.version === right.version &&
    left.savedAt === right.savedAt &&
    left.preferences.necessary === right.preferences.necessary &&
    left.preferences.statistics === right.preferences.statistics &&
    left.preferences.marketing === right.preferences.marketing
  );
}

function getSafeLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    logConsentDebug("localStorage-unavailable", error);
    return null;
  }
}

function readConsentFromStorage(): ConsentState | null {
  const storage = getSafeLocalStorage();

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(CONSENT_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (isConsentState(parsedValue)) {
      return parsedValue;
    }

    logConsentDebug("invalid-consent-shape", parsedValue);
  } catch {
    logConsentDebug("invalid-consent-json");
  }

  storage.removeItem(CONSENT_STORAGE_KEY);

  return null;
}

function notifyConsentListeners() {
  consentListeners.forEach((listener) => {
    listener();
  });
}

function dispatchConsentUpdated(consent: ConsentState | null) {
  if (typeof window === "undefined") {
    return;
  }

  logConsentDebug("consent-updated-event", consent?.preferences ?? null);
  window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT, { detail: consent }));
}

function updateConsentSnapshot(nextSnapshot: ConsentState | null) {
  if (areConsentStatesEqual(currentConsentSnapshot, nextSnapshot)) {
    return currentConsentSnapshot;
  }

  currentConsentSnapshot = nextSnapshot;
  notifyConsentListeners();

  return currentConsentSnapshot;
}

function initializeConsentSnapshot() {
  if (hasInitializedConsentSnapshot) {
    return currentConsentSnapshot;
  }

  currentConsentSnapshot = readConsentFromStorage();
  hasInitializedConsentSnapshot = true;

  return currentConsentSnapshot;
}

function attachBrowserListeners() {
  if (hasAttachedBrowserListeners || typeof window === "undefined") {
    return;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== CONSENT_STORAGE_KEY) {
      return;
    }

    logConsentDebug("storage-sync");
    updateConsentSnapshot(readConsentFromStorage());
  };

  window.addEventListener("storage", handleStorage);
  hasAttachedBrowserListeners = true;
}

export function subscribeToConsentStore(listener: ConsentListener) {
  if (typeof window === "undefined") {
    return () => {};
  }

  initializeConsentSnapshot();
  attachBrowserListeners();
  consentListeners.add(listener);

  return () => {
    consentListeners.delete(listener);
  };
}

export function getStoredConsentSnapshot() {
  if (typeof window === "undefined") {
    return serverConsentSnapshot;
  }

  return initializeConsentSnapshot();
}

export function getStoredConsentServerSnapshot() {
  return serverConsentSnapshot;
}

export function writeStoredConsent(value: ConsentState) {
  const storage = getSafeLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value));
    logConsentDebug("consent-saved", value.preferences);
  } catch (error) {
    logConsentDebug("consent-save-failed", error);
    return;
  }

  updateConsentSnapshot(value);
  dispatchConsentUpdated(value);
}

export function saveConsentPreferences(
  preferences: Partial<Omit<ConsentPreferences, "necessary">>
) {
  const consent = createConsentState(preferences);

  writeStoredConsent(consent);

  return consent;
}

export function resetStoredConsent() {
  const storage = getSafeLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(CONSENT_STORAGE_KEY);
    logConsentDebug("consent-reset");
  } catch (error) {
    logConsentDebug("consent-reset-failed", error);
    return;
  }

  updateConsentSnapshot(null);
  dispatchConsentUpdated(null);
}

export function hasConsentForCategory(
  consent: ConsentState | null,
  category: ConsentCategory
) {
  if (category === "necessary") {
    return true;
  }

  return consent?.preferences[category] ?? false;
}

export function openCookiePreferences() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

export function installConsentDebugHelpers() {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return;
  }

  window.__abschlussioConsentDebug = {
    open: openCookiePreferences,
    read: getStoredConsentSnapshot,
    reset: resetStoredConsent,
  };
}

export function removeConsentDebugHelpers() {
  if (typeof window === "undefined") {
    return;
  }

  delete window.__abschlussioConsentDebug;
}
