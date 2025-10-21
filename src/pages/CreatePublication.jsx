import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canCreate, canPublish, RESOURCE_TYPES } from '../lib/permissions.js';

const CreatePublication = () => {
  const { user } = useAuth();

  if (!canCreate(user, RESOURCE_TYPES.PUBLICATION)) {
    return <Navigate to="/" replace />;
  }

  const canUserPublish = canPublish(user, RESOURCE_TYPES.PUBLICATION);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Publicaciones</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Crear una nueva publicación</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sigue estas instrucciones para registrar un nuevo documento en <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">data/publications</code> y validarlo antes de compartirlo.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pasos recomendados</h2>
        <ol className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
          <li>
            <span className="font-semibold">1. Duplica un archivo existente</span>. Copia cualquiera de los JSON dentro de <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">data/publications</code> y renómbralo con el identificador de tu borrador.
          </li>
          <li>
            <span className="font-semibold">2. Actualiza los campos obligatorios</span>. Asegúrate de completar <code>title</code>, <code>summary</code>, <code>body</code>, <code>authorEmail</code> y <code>status</code>. Si estás trabajando en un borrador, utiliza el estado <code>draft</code>.
          </li>
          <li>
            <span className="font-semibold">3. Valida el contenido</span>. Ejecuta <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">npm run validate:data</code> para verificar el esquema y tus permisos de autoría.
          </li>
          <li>
            <span className="font-semibold">4. Envía la propuesta</span>. Crea un pull request o comparte el archivo con un administrador para su revisión.
          </li>
        </ol>
      </section>

      {canUserPublish ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-200">
          <h2 className="text-base font-semibold">Permisos de publicación</h2>
          <p className="mt-2">
            Además de crear borradores, puedes cambiar el campo <code>status</code> a <code>published</code> y completar <code>publishedAt</code> cuando una publicación esté lista para salir a producción.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
          <h2 className="text-base font-semibold">Recuerda compartir tu borrador</h2>
          <p className="mt-2">
            Una vez que el JSON esté listo y validado, compártelo con un administrador para que lo publique. Ellos actualizarán el estado a <code>published</code> cuando corresponda.
          </p>
        </section>
      )}
    </div>
  );
};

export default CreatePublication;
