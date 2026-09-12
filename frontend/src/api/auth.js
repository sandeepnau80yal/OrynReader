import request from "./client";

// Sends the Google ID token to the Express API, gets back our own JWT + user record.
export function verifyGoogleToken(idToken) {
  return request("/auth/google", { method: "POST", body: { idToken } });
}
