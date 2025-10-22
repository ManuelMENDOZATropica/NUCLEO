import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Licenses from "./pages/Licenses";
import Admin from "./pages/Admin";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ALLOWED_DOMAIN = "tropica.me";
const STORAGE_KEY = "tropica:user";
const USERS_STORAGE_KEY = "tropica:users";
const DEFAULT_ADMIN_EMAIL = "manuel@tropica.me";
const ROLES = ["Admin", "Editor", "Viewer"];

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function ensureDefaultAdmin(list) {
  const normalizedDefault = normalizeEmail(DEFAULT_ADMIN_EMAIL);
  let hasAdmin = false;

  const updated = list.map(user => {
    if (normalizeEmail(user.email) === normalizedDefault) {
      hasAdmin = true;
      return { ...user, role: "Admin" };
    }
    return user;
  });

  if (!hasAdmin) {
    updated.push({
      email: DEFAULT_ADMIN_EMAIL,
      name: "Manuel",
      picture: "",
      role: "Admin",
      createdAt: new Date().toISOString(),
    });
  }

  return updated;
}

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
  const [users, setUsers] = useState([]);
  const [isUsersReady, setIsUsersReady] = useState(false);
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
    let cancelled = false;

    async function loadUsers() {
      let data = [];

      try {
        const stored = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY));
        if (Array.isArray(stored)) {
          data = stored;
        }
      } catch {
        // ignore storage parsing errors
      }

      if (!Array.isArray(data) || data.length === 0) {
        try {
          const response = await fetch("/json-db/users.json", { cache: "no-store" });
          if (response.ok) {
            const json = await response.json();
            if (Array.isArray(json)) {
              data = json;
            }
          }
        } catch {
          // network errors are ignored; we fall back to defaults
        }
      }

      if (!Array.isArray(data)) {
        data = [];
      }

      const prepared = ensureDefaultAdmin(data);

      if (!cancelled) {
        setUsers(prepared);
        setIsUsersReady(true);
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isUsersReady) return;
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {
      // ignore storage failures
    }
  }, [users, isUsersReady]);

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

  useEffect(() => {
    if (!isUsersReady || !user?.email) return;

    setUsers(prev => {
      const normalizedEmail = normalizeEmail(user.email);
      let found = false;

      const updated = prev.map(item => {
        if (normalizeEmail(item.email) === normalizedEmail) {
          found = true;
          return {
            ...item,
            name: user.name || item.name || user.email,
            picture: user.picture || item.picture || "",
          };
        }
        return item;
      });

      if (!found) {
        updated.push({
          email: user.email.trim(),
          name: user.name || user.email,
          picture: user.picture || "",
          role: normalizedEmail === normalizeEmail(DEFAULT_ADMIN_EMAIL) ? "Admin" : "Viewer",
          createdAt: new Date().toISOString(),
        });
      }

      return ensureDefaultAdmin(updated);
    });
  }, [user, isUsersReady]);

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

  const handleCreateUser = useCallback((newUser) => {
    if (!newUser?.email) return;

    const normalizedEmail = normalizeEmail(newUser.email);
    const role = ROLES.includes(newUser.role) ? newUser.role : "Viewer";

    setUsers(prev => {
      if (prev.some(item => normalizeEmail(item.email) === normalizedEmail)) {
        return prev;
      }

      const record = {
        email: newUser.email.trim(),
        name: newUser.name || newUser.email,
        picture: newUser.picture || "",
        role,
        createdAt: newUser.createdAt || new Date().toISOString(),
      };

      return ensureDefaultAdmin([...prev, record]);
    });
  }, []);

  const handleUpdateUserRole = useCallback((email, role) => {
    if (!email || !ROLES.includes(role)) return;

    const normalizedEmail = normalizeEmail(email);

    if (normalizedEmail === normalizeEmail(DEFAULT_ADMIN_EMAIL)) {
      return;
    }

    setUsers(prev => {
      const updated = prev.map(userRecord => {
        if (normalizeEmail(userRecord.email) === normalizedEmail) {
          return { ...userRecord, role };
        }
        return userRecord;
      });

      return ensureDefaultAdmin(updated);
    });
  }, []);

  const handleDeleteUser = useCallback((email) => {
    if (!email) return;

    const normalizedEmail = normalizeEmail(email);

    if (normalizedEmail === normalizeEmail(DEFAULT_ADMIN_EMAIL)) {
      return;
    }

    setUsers(prev => {
      const filtered = prev.filter(userRecord => normalizeEmail(userRecord.email) !== normalizedEmail);
      return ensureDefaultAdmin(filtered);
    });
  }, []);

  const signOut = () => {
    setUser(null);
    setActiveView("home");
  };

  const currentUserRecord = useMemo(
    () => users.find(item => normalizeEmail(item.email) === normalizeEmail(user?.email)),
    [users, user]
  );

  const currentRole = currentUserRecord?.role || "Viewer";
  const isAdmin = currentRole === "Admin";

  useEffect(() => {
    if (activeView === "admin" && !isAdmin) {
      setActiveView("home");
    }
  }, [activeView, isAdmin]);

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
      <Navbar
        active={activeView}
        onNavigate={setActiveView}
        user={user}
        onSignOut={signOut}
        showAdmin={isAdmin}
      />
      <main style={{ minHeight: "calc(100vh - 72px)" }}>
        {activeView === "home" && <Home user={user} role={currentRole} />}
        {activeView === "licenses" && <Licenses />}
        {activeView === "admin" && isAdmin && (
          <Admin
            users={users}
            roles={ROLES}
            onCreateUser={handleCreateUser}
            onUpdateUserRole={handleUpdateUserRole}
            onDeleteUser={handleDeleteUser}
            currentUserEmail={user.email}
            defaultAdminEmail={DEFAULT_ADMIN_EMAIL}
            allowedDomain={ALLOWED_DOMAIN}
          />
        )}
      </main>
    </div>
  );
}
