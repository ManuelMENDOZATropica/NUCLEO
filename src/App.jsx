import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ALLOWED_DOMAIN = "tropica.me";
const STORAGE_KEY = "tropica:user";

// Decodifica el JWT que regresa Google Identity Services
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
  const buttonRef = useRef(null);

  const isAllowed = useMemo(
    () => (email) => typeof email === "string" && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`),
    []
  );

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  // Cargar script de Google Identity Services dinámicamente
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

  // Callback cuando Google regresa el credential (JWT)
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

  // Inicializar botón y prompt
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

    // Opcional: mostrar prompt “One Tap” si aplica
    window.google.accounts.id.prompt();
  }, [handleCredentialResponse, isButtonRendered, isScriptLoaded]);

  useEffect(() => { initializeGoogle(); }, [initializeGoogle]);

  const signOut = () => setUser(null);

  if (!user) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:"#f7f7f8"}}>
        <div style={{width:"100%",maxWidth:420,background:"#fff",borderRadius:16,boxShadow:"0 10px 30px rgba(0,0,0,.06)",padding:24}}>
          <h1 style={{fontSize:22,fontWeight:600,marginBottom:8}}>Acceso TRÓPICA</h1>
          <p style={{fontSize:13,color:"#6b7280",marginBottom:16}}>
            Inicia sesión con tu cuenta de Google corporativa <code>@{ALLOWED_DOMAIN}</code>.
          </p>
          <div ref={buttonRef} style={{display:"flex",justifyContent:"center"}} />
          {(!GOOGLE_CLIENT_ID || !isScriptLoaded) && (
            <p style={{fontSize:13,color:"#6b7280",marginTop:12}}>
              {GOOGLE_CLIENT_ID ? "Cargando Google Sign-In…" : "Configura VITE_GOOGLE_CLIENT_ID en tu .env"}
            </p>
          )}
          {error && (
            <div style={{marginTop:12,fontSize:13,color:"#b91c1c",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:12}}>
              {error}
            </div>
          )}
          <p style={{marginTop:12,fontSize:12,color:"#9ca3af",lineHeight:1.5}}>
            Este login usa Google Identity Services y valida el dominio <code>@{ALLOWED_DOMAIN}</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:"#f7f7f8"}}>
      <div style={{width:"100%",maxWidth:520,background:"#fff",borderRadius:16,boxShadow:"0 10px 30px rgba(0,0,0,.06)",padding:24}}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{height:48,width:48,borderRadius:999,overflow:"hidden",background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>
            {user.picture
              ? <img src={user.picture} alt={user.name || user.email} style={{height:"100%",width:"100%",objectFit:"cover"}} referrerPolicy="no-referrer"/>
              : (user.name || user.email || "U").charAt(0).toUpperCase()
            }
          </div>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,margin:0}}>Hola, {user.name || "usuario"}</h2>
            <p style={{fontSize:13,color:"#6b7280",margin:0}}>{user.email}</p>
          </div>
        </div>

        <div style={{marginTop:16,border:"1px solid #e5e7eb",borderRadius:16,padding:14,fontSize:14,color:"#4b5563"}}>
          Sesión activa. App mínima con solo login de Google y validación <code>@{ALLOWED_DOMAIN}</code>.
        </div>

        <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{fontSize:12,color:"#9ca3af",margin:0}}>Tip: cierra sesión para probar otro usuario.</p>
          <button onClick={signOut} style={{border:"1px solid #d1d5db",borderRadius:14,padding:"8px 12px",fontSize:13,background:"#fff"}}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
