import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const decodeJwtPayload = (token) => {
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    const jsonPayload = decodeURIComponent(
      decoded
        .split('')
        .map((character) => `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('No se pudo decodificar el token de Google', error);
    return null;
  }
};

const Login = () => {
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef(null);
  const [error, setError] = useState('');
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isButtonRendered, setIsButtonRendered] = useState(false);

  const handleCredentialResponse = useCallback(
    (response) => {
      try {
        const payload = decodeJwtPayload(response?.credential);

        if (!payload) {
          throw new Error('No se pudo validar la respuesta de Google.');
        }

        loginWithGoogle({
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        });
        setError('');
      } catch (err) {
        console.error('Error durante el inicio de sesión con Google', err);
        setError(err.message ?? 'No se pudo iniciar sesión con Google.');
      }
    },
    [loginWithGoogle],
  );

  const initializeGoogle = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        ux_mode: 'popup',
      });

      if (buttonRef.current && !isButtonRendered) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_blue',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'signin_with',
        });
        setIsButtonRendered(true);
      }

      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('No se pudo inicializar Google Sign-In', error);
      setError('No se pudo inicializar Google Sign-In.');
    }
  }, [handleCredentialResponse, isButtonRendered]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError('No se configuró el cliente de Google.');
      return;
    }

    if (window.google?.accounts?.id) {
      setIsScriptLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[data-google-identity]');
    if (existingScript) {
      const onLoad = () => {
        setIsScriptLoaded(true);
      };
      const onError = () => {
        setError('No se pudo cargar Google Sign-In.');
      };

      existingScript.addEventListener('load', onLoad);
      existingScript.addEventListener('error', onError);

      return () => {
        existingScript.removeEventListener('load', onLoad);
        existingScript.removeEventListener('error', onError);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      setError('No se pudo cargar Google Sign-In.');
    };
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  useEffect(() => {
    if (!isScriptLoaded) {
      return;
    }

    initializeGoogle();
  }, [initializeGoogle, isScriptLoaded]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-16 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-slate-700">
        <div className="mb-6 text-center">
          <img src="/logo.svg" alt="NUCLEO" className="mx-auto h-12 w-12" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">Bienvenido a NUCLEO</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Inicia sesión con tu cuenta de Google corporativa <span className="font-semibold">@tropica.me</span>.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex w-full flex-col items-center justify-center gap-3">
            <div ref={buttonRef} className="flex w-full justify-center" />
            {!GOOGLE_CLIENT_ID ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Debes configurar la variable <code>VITE_GOOGLE_CLIENT_ID</code>.
              </p>
            ) : null}
            {!isScriptLoaded && GOOGLE_CLIENT_ID ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando Google Sign-In…</p>
            ) : null}
          </div>
          {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Al continuar aceptas iniciar sesión con Google para validar tu correo corporativo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
