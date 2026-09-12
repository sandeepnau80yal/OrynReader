import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { token, scriptLoaded, renderSignInButton } = useAuth();
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  // Already signed in (e.g. token in localStorage from a previous visit) - skip straight to the library.
  useEffect(() => {
    if (token) navigate("/library", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (scriptLoaded) renderSignInButton(buttonRef.current);
  }, [scriptLoaded, renderSignInButton]);

  return (
    <div className="landing">
      <div className="landing__content">
        <span className="landing__mark">📚</span>
        <h1 className="landing__title">Oryn Reader</h1>
        <p className="landing__tagline">Your personal library, wherever you open it.</p>
        <div ref={buttonRef} className="landing__signin" />
      </div>
    </div>
  );
}
