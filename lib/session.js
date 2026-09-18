export const REP_COOKIE = "landit_rep_token";
export const COMPANY_COOKIE = "landit_company_token";

// How long a magic-link login token stays valid before a rep has to request
// a new one. Kept short since it's emailed as a plain clickable link.
export const LOGIN_TOKEN_TTL_MINUTES = 15;

export function newAccessToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function newLoginToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function loginTokenExpiry() {
  return new Date(Date.now() + LOGIN_TOKEN_TTL_MINUTES * 60 * 1000);
}
