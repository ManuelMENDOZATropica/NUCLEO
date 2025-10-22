import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Licenses from "./pages/Licenses";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ALLOWED_DOMAIN = "tropica.me";
const STORAGE_KEY = "tropica:user";

function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    const json = decodeURIComponent(
      [...decoded].map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
  });
  const [error, setError] = useState("");
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isButtonRendered, setIsButtonRendered] = useState(false);
  const [activeView, setActiveView] = useState("home");
  const buttonRef = useRef(null);

  const isAllowed = useMemo(
    () => (email) => typeof email === "string" && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`),
    []
  );

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Falta VITE_GOOGLE_CLIENT_ID en tu .env");
      return;
    }
    if (window.google?.accounts?.id) {
      setIsScriptLoaded(true);
      return;
    }
    const existing = document.querySelector("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", () => setIsScriptLoaded(true));
      existing.addEventListener("error", () => setError("No se pudo cargar Google Sign-In."));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.dataset.googleIdentity = "true";
    s.onload = () => setIsScriptLoaded(true);
    s.onerror = () => setError("No se pudo cargar Google Sign-In.");
    document.head.appendChild(s);
  }, []);

  const handleCredentialResponse = useCallback((response) => {
    const payload = decodeJwtPayload(response?.credential);
    const email = payload?.email || "";
    const name = payload?.name || "";
    const picture = payload?.picture || "";

    if (!isAllowed(email)) {
      setError("Solo se permiten cuentas @tropica.me");
      return;
    }
    setUser({ email, name, picture });
    setError("");
  }, [isAllowed]);

  const initializeGoogle = useCallback(() => {
    if (!isScriptLoaded || !window.google?.accounts?.id || !GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      ux_mode: "popup",
    });

    if (buttonRef.current && !isButtonRendered) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_blue",
        size: "large",
        type: "standard",
        shape: "pill",
        text: "signin_with",
      });
      setIsButtonRendered(true);
    }

    window.google.accounts.id.prompt();
  }, [handleCredentialResponse, isButtonRendered, isScriptLoaded]);

  useEffect(() => { initializeGoogle(); }, [initializeGoogle]);

  const signOut = () => {
    setUser(null);
    setActiveView("home");
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f7f7f8" }}>
        <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,.06)", padding: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Acceso TRÓPICA</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Inicia sesión con tu cuenta de Google corporativa <code>@{ALLOWED_DOMAIN}</code>.
          </p>
          <div ref={buttonRef} style={{ display: "flex", justifyContent: "center" }} />
          {(!GOOGLE_CLIENT_ID || !isScriptLoaded) && (
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 12 }}>
              {GOOGLE_CLIENT_ID ? "Cargando Google Sign-In…" : "Configura VITE_GOOGLE_CLIENT_ID en tu .env"}
            </p>
          )}
          {error && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 12 }}>
              {error}
            </div>
          )}
          <p style={{ marginTop: 12, fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
            Este login usa Google Identity Services y valida el dominio <code>@{ALLOWED_DOMAIN}</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #e2e8f0 0%, #f8fafc 40%, #f8fafc 100%)" }}>
      <Navbar active={activeView} onNavigate={setActiveView} user={user} onSignOut={signOut} />
      <main style={{ minHeight: "calc(100vh - 72px)" }}>
        {activeView === "home" && <Home user={user} />}
        {activeView === "licenses" && <Licenses />}
      </main>
    </div>
  );
}
