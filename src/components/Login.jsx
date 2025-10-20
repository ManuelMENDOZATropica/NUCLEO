import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await Promise.resolve(login(email));
    } catch (err) {
      setError(err.message ?? 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-16 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-slate-700">
        <div className="mb-6 text-center">
          <img src="/logo.svg" alt="NUCLEO" className="mx-auto h-12 w-12" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">Bienvenido a NUCLEO</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Accede con tu correo corporativo <span className="font-semibold">@tropica.me</span>.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="tunombre@tropica.me"
            />
          </div>
          {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 focus:outline-none focus:ring focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
