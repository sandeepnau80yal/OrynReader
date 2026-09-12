import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { verifyGoogleToken } from "../api/auth";

const AuthContext = createContext(null);
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const handleCredentialResponse = useCallback(async (response) => {
    try {
      const { user: apiUser, token: apiToken } = await verifyGoogleToken(response.credential);
      setUser(apiUser);
      setToken(apiToken);
      localStorage.setItem("token", apiToken);
    } catch (err) {
      console.error("Google sign-in failed:", err);
    }
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      setScriptLoaded(true);
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, [handleCredentialResponse]);

  // Call this with a ref to a div, e.g. renderSignInButton(buttonRef.current)
  const renderSignInButton = useCallback(
    (el) => {
      if (scriptLoaded && el) {
        window.google.accounts.id.renderButton(el, { theme: "outline", size: "large" });
      }
    },
    [scriptLoaded]
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    window.google?.accounts.id.disableAutoSelect();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, scriptLoaded, renderSignInButton, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
