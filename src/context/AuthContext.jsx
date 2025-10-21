import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getUserByEmail } from '../lib/data/users.js';

const AuthContext = createContext(null);

const STORAGE_KEY = 'nucleo-auth-user';
const ALLOWED_DOMAIN = 'tropica.me';

const buildSessionUser = (record, overrides = {}) => {
  if (!record) {
    return null;
  }

  const nameOverride = typeof overrides.name === 'string' ? overrides.name.trim() : '';
  const pictureOverride = typeof overrides.picture === 'string' ? overrides.picture : '';

  return {
    ...record,
    name: nameOverride || record.name || record.email,
    picture: pictureOverride,
  };
};

const normalizeStoredUser = (rawUser) => {
  if (!rawUser || typeof rawUser !== 'object') {
    return null;
  }

  const email = typeof rawUser.email === 'string' ? rawUser.email.trim().toLowerCase() : null;

  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return null;
  }

  const baseRecord = getUserByEmail(email);

  if (!baseRecord || baseRecord.active === false) {
    return null;
  }

  return buildSessionUser(baseRecord, rawUser);
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

    const baseRecord = getUserByEmail(normalizedEmail);

    if (!baseRecord) {
      throw new Error('Tu cuenta no está autorizada para acceder a NUCLEO.');
    }

    if (baseRecord.active === false) {
      throw new Error('Tu cuenta está inactiva en NUCLEO. Contacta a un administrador.');
    }

    const sessionUser = buildSessionUser(baseRecord, {
      name: profile?.name,
      picture: profile?.picture,
    });

    setUser(sessionUser);
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
