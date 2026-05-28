// Lightweight cookie helpers + consent-gated draft / defaults storage.
// Used by CookieConsent banner and form modals (AddLeadModal, CustomerModal)
// to remember in-progress entries and last-used values across sessions.

const CONSENT_KEY = 'kt_cookie_consent';

export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1');
  const m = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
};

export const setCookie = (name, value, days = 365) => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

export const removeCookie = (name) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

export const getConsentDecision = () => getCookie(CONSENT_KEY); // 'accepted' | 'declined' | null
export const hasConsent = () => getConsentDecision() === 'accepted';
export const setConsent = (accepted) => setCookie(CONSENT_KEY, accepted ? 'accepted' : 'declined', 365);

const setJson = (name, obj, days) => {
  if (!hasConsent()) return false;
  try {
    setCookie(name, JSON.stringify(obj), days);
    return true;
  } catch {
    return false;
  }
};

const getJson = (name) => {
  const raw = getCookie(name);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

// Form drafts — short-lived, full form snapshot for "resume where you left off"
export const saveDraft    = (formId, data) => setJson(`kt_draft_${formId}`, data, 14);
export const loadDraft    = (formId)       => getJson(`kt_draft_${formId}`);
export const clearDraft   = (formId)       => removeCookie(`kt_draft_${formId}`);

// Last-used defaults — long-lived, a few stable fields the user rarely changes
// (e.g. lead source, assigned agent, priority). Used to pre-fill empty forms.
export const saveDefaults = (formId, data) => setJson(`kt_defaults_${formId}`, data, 365);
export const loadDefaults = (formId)       => getJson(`kt_defaults_${formId}`) || {};
