import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'nucleo-auth-user';
const ALLOWED_DOMAIN = 'tropica.me';

const normalizeStoredUser = (rawUser) => {
  if (!rawUser || typeof rawUser !== 'object') {
    return null;
  }

  const email = typeof rawUser.email === 'string' ? rawUser.email : null;

  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return null;
  }

  return {
    email,
    name: typeof rawUser.name === 'string' ? rawUser.name : '',
    picture: typeof rawUser.picture === 'string' ? rawUser.picture : '',
  };
};

function getInitialUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeStoredUser(parsed);
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

  const loginWithGoogle = useCallback((profile) => {
    const normalizedEmail = String(profile?.email ?? '').trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('No se recibió el correo electrónico de Google.');
    }

    if (!normalizedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      throw new Error('Solo se permiten cuentas @tropica.me.');
    }

    const name = String(profile?.name ?? '').trim();
    const picture = typeof profile?.picture === 'string' ? profile.picture : '';

    setUser({
      email: normalizedEmail,
      name,
      picture,
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      login: loginWithGoogle,
      loginWithGoogle,
      logout,
    }),
    [user, loginWithGoogle, logout],
  );

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
