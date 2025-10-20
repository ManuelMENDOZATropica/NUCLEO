import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'nucleo-auth-user';
const ALLOWED_DOMAIN = 'tropica.me';

function getInitialUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.email && typeof parsed.email === 'string' && parsed.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return parsed;
    }
  } catch (error) {
    console.warn('No se pudo leer el usuario almacenado', error);
  }

  return null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getInitialUser());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback((email) => {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('Ingresa tu correo corporativo.');
    }

    if (!normalizedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      throw new Error('Solo se permiten cuentas @tropica.me.');
    }

    setUser({ email: normalizedEmail });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
