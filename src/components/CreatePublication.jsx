import React, { useMemo, useState } from 'react';
import CrudButtonGroup from './CrudButtonGroup.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getEditablePublicationsForUser } from '../lib/data/publications.js';
import { canPublish, RESOURCE_TYPES } from '../lib/permissions.js';

const defaultDescription =
  'Crea, consulta y actualiza las publicaciones internas sin salir de la documentación.';

const CreatePublication = ({
  title = 'Gestión de publicaciones',
  description = defaultDescription,
  readHref = '/buscar?q=publicaciones',
  className = '',
  onCreate,
  onRead,
  onUpdate,
  onDelete,
}) => {
  const { user } = useAuth();
  const [lastAction, setLastAction] = useState('');
  const editablePublications = useMemo(
    () => (user ? getEditablePublicationsForUser(user) : []),
    [user]
  );
  const hasPublishPermission = user
    ? canPublish(user, RESOURCE_TYPES.PUBLICATION)
    : false;

  const containerClasses = [
    'space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleAction = (label, callback) => {
    setLastAction(`${label} · publicaciones`);
    callback?.();
  };

  const audienceMessage = user
    ? editablePublications.length
      ? `Puedes editar ${
          editablePublications.length === 1
            ? '1 publicación'
            : `${editablePublications.length} publicaciones`
        } asignadas a tu cuenta.`
      : 'Aún no tienes publicaciones asignadas para editar.'
    : 'Inicia sesión para gestionar las publicaciones del equipo.';

  return (
    <section className={containerClasses}>
      <header className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
        ) : null}
      </header>

      <CrudButtonGroup
        labels={{ read: 'Consultar', update: 'Actualizar' }}
        readHref={readHref}
        onCreate={() => handleAction('Crear', onCreate)}
        onRead={() => handleAction('Consultar', onRead)}
        onUpdate={() => handleAction('Actualizar', onUpdate)}
        onDelete={() => handleAction('Eliminar', onDelete)}
      />

      {lastAction ? (
        <div
          className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary dark:border-primary/30 dark:bg-primary/10"
          role="status"
          aria-live="polite"
        >
          {lastAction}
        </div>
      ) : null}

      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <p>{audienceMessage}</p>
        {user ? (
          <p>
            {hasPublishPermission
              ? 'También puedes publicar cambios aprobados para todo el equipo.'
              : 'Solicita apoyo de un administrador para publicar los cambios finales.'}
          </p>
        ) : null}
        {user && editablePublications.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {editablePublications.slice(0, 3).map((publication) => (
              <li key={publication.id} className="truncate">
                {publication.title}
              </li>
            ))}
            {editablePublications.length > 3 ? (
              <li className="font-medium">
                +{editablePublications.length - 3} más listadas en la bandeja
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </section>
  );
};

export default CreatePublication;
