import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Licenses from "./pages/Licenses";
import Admin from "./pages/Admin";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function buildApiUrl(path = "") {
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}
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
  const seen = new Set();

  const sanitized = [];

  list.forEach(user => {
    const normalizedEmail = normalizeEmail(user?.email);

    if (!normalizedEmail) {
      sanitized.push(user);
      return;
    }

    if (normalizedEmail === normalizedDefault) {
      if (!hasAdmin) {
        sanitized.push({ ...user, role: "Admin" });
        hasAdmin = true;
      }
      return;
    }

    if (!seen.has(normalizedEmail)) {
      sanitized.push(user);
      seen.add(normalizedEmail);
    }
  });

  if (!hasAdmin) {
    sanitized.push({
      _id: "__default-admin__",
      email: DEFAULT_ADMIN_EMAIL,
      name: "Manuel",
      picture: "",
      role: "Admin",
      createdAt: new Date().toISOString(),
    });
  }

  return sanitized;
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
  const [licenses, setLicenses] = useState([]);
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
      let licenseData = [];

      try {
        const response = await fetch(buildApiUrl("/api/users"), {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error("No se pudieron obtener los usuarios");
        }

        const json = await response.json();
        if (Array.isArray(json)) {
          data = json;
        }
      } catch (err) {
        console.error(err);
        try {
          const stored = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY));
          if (Array.isArray(stored)) {
            data = stored;
          }
        } catch {
          // ignore storage errors
        }
      }

      if (!Array.isArray(data)) {
        data = [];
      }

      try {
        const response = await fetch(buildApiUrl("/api/licenses"), {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error("No se pudieron obtener las licencias");
        }

        const json = await response.json();
        if (Array.isArray(json)) {
          licenseData = json;
        }
      } catch (err) {
        console.error(err);
        licenseData = [];
      }

      const prepared = ensureDefaultAdmin(data);

      if (!Array.isArray(licenseData)) {
        licenseData = [];
      }

      if (!cancelled) {
        setUsers(prepared);
        setLicenses(licenseData);
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

  // --- BLOQUE DE FUNCIONES MOVIDO ---
  // Se movieron aquí para solucionar el error "Temporal Dead Zone".

  const handleCreateUser = useCallback(async (newUser) => {
    if (!newUser?.email) {
      return { ok: false, error: "El correo es obligatorio" };
    }

    const payload = {
      email: newUser.email.trim(),
      name: newUser.name || newUser.email,
      picture: newUser.picture || "",
      role: ROLES.includes(newUser.role) ? newUser.role : "Viewer",
      createdAt: newUser.createdAt,
    };

    try {
      const response = await fetch(buildApiUrl("/api/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { ok: false, error: error?.message || "No se pudo crear el usuario" };
      }

      const created = await response.json();
      setUsers(prev => ensureDefaultAdmin([...prev, created]));
      return { ok: true, data: created };
    } catch (error) {
      console.error(error);
      return { ok: false, error: "No se pudo conectar con el servidor" };
    }
  }, []);

  const handleUpdateUserRole = useCallback(async (id, email, role) => {
    if (!id || !role || !ROLES.includes(role)) {
      return { ok: false, error: "Datos inválidos" };
    }

    if (normalizeEmail(email) === normalizeEmail(DEFAULT_ADMIN_EMAIL)) {
      return { ok: false, error: "No puedes modificar al administrador predeterminado" };
    }

    try {
      const response = await fetch(buildApiUrl(`/api/users/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { ok: false, error: error?.message || "No se pudo actualizar el usuario" };
      }

      const updated = await response.json();
      setUsers(prev =>
        ensureDefaultAdmin(
          prev.map(userRecord =>
            userRecord._id === updated._id ? { ...userRecord, ...updated } : userRecord
          )
        )
      );
      return { ok: true, data: updated };
    } catch (error) {
      console.error(error);
      return { ok: false, error: "No se pudo conectar con el servidor" };
    }
  }, []);

  const handleDeleteUser = useCallback(async (id, email) => {
    if (!id) {
      return { ok: false, error: "Usuario inválido" };
    }

    if (normalizeEmail(email) === normalizeEmail(DEFAULT_ADMIN_EMAIL)) {
      return { ok: false, error: "No puedes eliminar al administrador predeterminado" };
    }

    try {
      const response = await fetch(buildApiUrl(`/api/users/${id}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { ok: false, error: error?.message || "No se pudo eliminar el usuario" };
      }

      setUsers(prev =>
        ensureDefaultAdmin(prev.filter(userRecord => userRecord._id !== id))
      );
      return { ok: true };
    } catch (error) {
      console.error(error);
      return { ok: false, error: "No se pudo conectar con el servidor" };
    }
  }, []);

  const handleCreateLicense = useCallback(async (newLicense) => {
    if (!newLicense) {
      return { ok: false, error: "Datos inválidos" };
    }

    try {
      const response = await fetch(buildApiUrl("/api/licenses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLicense),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { ok: false, error: error?.message || "No se pudo crear la licencia" };
      }

      const created = await response.json();
      setLicenses(prev => [...prev, created]);
      return { ok: true, data: created };
    } catch (error) {
      console.error(error);
      return { ok: false, error: "No se pudo conectar con el servidor" };
    }
  }, []);

  const handleUpdateLicense = useCallback(async (id, data) => {
    if (!id || !data) {
      return { ok: false, error: "Datos inválidos" };
    }

    try {
      const response = await fetch(buildApiUrl(`/api/licenses/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { ok: false, error: error?.message || "No se pudo actualizar la licencia" };
      }

      const updated = await response.json();
      setLicenses(prev => prev.map(item => (item._id === id ? { ...item, ...updated } : item)));
      return { ok: true, data: updated };
    } catch (error) {
      console.error(error);
      return { ok: false, error: "No se pudo conectar con el servidor" };
    }
  }, []);

  const handleDeleteLicense = useCallback(async (id) => {
    if (!id) {
      return { ok: false, error: "Licencia inválida" };
    }

    try {
      const response = await fetch(buildApiUrl(`/api/licenses/${id}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { ok: false, error: error?.message || "No se pudo eliminar la licencia" };
      }

      setLicenses(prev => prev.filter(item => item._id !== id));
      return { ok: true };
    } catch (error) {
      console.error(error);
      return { ok: false, error: "No se pudo conectar con el servidor" };
    }
  }, []);

  // --- FIN DEL BLOQUE MOVIDO ---


  // --- useEffect CORREGIDO (para el bucle infinito) ---
  useEffect(() => {
    if (!isUsersReady || !user?.email) return;

    const normalizedEmail = normalizeEmail(user.email);
    const existing = users.find(item => normalizeEmail(item.email) === normalizedEmail);

    if (!existing) {
      const payload = {
        email: user.email.trim(),
        name: user.name || user.email,
        picture: user.picture || "",
        role: normalizedEmail === normalizeEmail(DEFAULT_ADMIN_EMAIL) ? "Admin" : "Viewer",
        createdAt: new Date().toISOString(),
      };

      handleCreateUser(payload);
    } else {
      // Comparamos los datos nuevos con los existentes.
      const newName = user.name || existing.name || user.email;
      const newPicture = user.picture || existing.picture || "";

      // Solo llamamos a setUsers SI hay un cambio real.
      if (existing.name !== newName || existing.picture !== newPicture) {
        setUsers(prev =>
          ensureDefaultAdmin(
            prev.map(item =>
              normalizeEmail(item.email) === normalizedEmail
                ? {
                    ...item,
                    name: newName,
                    picture: newPicture,
                  }
                : item
            )
          )
        );
      }
      // Si los datos son iguales, no hacemos nada y el bucle se detiene.
    }
  }, [user, isUsersReady, users, handleCreateUser]);

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

  const currentUserRecord = useMemo(
    () => users.find(item => normalizeEmail(item.email) === normalizeEmail(user?.email)),
    [users, user]
  );

  const currentRole = currentUserRecord?.role || "Viewer";
  const canAccessAdmin = currentRole === "Admin" || currentRole === "Editor";

  useEffect(() => {
    if (activeView === "admin" && !canAccessAdmin) {
      setActiveView("home");
    }
  }, [activeView, canAccessAdmin]);

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
        showAdmin={canAccessAdmin}
      />
      <main style={{ minHeight: "calc(100vh - 72px)" }}>
        {activeView === "home" && <Home user={user} role={currentRole} />}
        {activeView === "licenses" && <Licenses />}
        {activeView === "admin" && canAccessAdmin && (
          <Admin
            users={users}
            roles={ROLES}
            onCreateUser={handleCreateUser}
            onUpdateUserRole={handleUpdateUserRole}
            onDeleteUser={handleDeleteUser}
            currentUserEmail={user.email}
            defaultAdminEmail={DEFAULT_ADMIN_EMAIL}
            allowedDomain={ALLOWED_DOMAIN}
            currentRole={currentRole}
            licenses={licenses}
            onCreateLicense={handleCreateLicense}
            onUpdateLicense={handleUpdateLicense}
            onDeleteLicense={handleDeleteLicense}
          />
        )}
      </main>
    </div>
  );
}