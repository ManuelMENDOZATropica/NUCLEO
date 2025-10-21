import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canCreate, canManageUsers, canPublish, RESOURCE_TYPES, ROLES } from '../lib/permissions.js';

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.VIEWER]: 'Lector',
};

const ACTIONS = [
  {
    id: 'create-publication',
    label: 'Nueva publicación',
    description: 'Genera un borrador JSON y envíalo para revisión.',
    to: '/publicaciones/nueva',
    isVisible: (user) => canCreate(user, RESOURCE_TYPES.PUBLICATION),
  },
  {
    id: 'manage-category-posts',
    label: 'Administrar posts por categoría',
    description: 'Crea, actualiza o elimina posts asignados a tus categorías.',
    to: '/categorias/gestionar',
    isVisible: (user) => canCreate(user, RESOURCE_TYPES.POST),
  },
  {
    id: 'publish-publication',
    label: 'Publicar contenido',
    description: 'Aprueba y programa publicaciones listas para producción.',
    to: '/publicaciones',
    isVisible: (user) => canPublish(user, RESOURCE_TYPES.PUBLICATION),
  },
  {
    id: 'manage-categories',
    label: 'Gestionar categorías',
    description: 'Define nuevas categorías o archiva las existentes.',
    to: '/admin/categorias',
    isVisible: (user) => canCreate(user, RESOURCE_TYPES.CATEGORY),
  },
  {
    id: 'manage-users',
    label: 'Gestionar usuarios',
    description: 'Crea cuentas nuevas y asigna roles del equipo.',
    to: '/admin/usuarios',
    isVisible: (user) => canCreate(user, RESOURCE_TYPES.USER) || canManageUsers(user),
  },
];

const CreationMenu = () => {
  const { user } = useAuth();

  const availableActions = useMemo(() => {
    if (!user) {
      return [];
    }

    return ACTIONS.filter((action) => {
      try {
        return action.isVisible(user);
      } catch (error) {
        console.warn('No se pudo evaluar permisos para la acción', action.id, error);
        return false;
      }
    });
  }, [user]);

  if (!user) {
    return null;
  }

  const roleLabel = ROLE_LABELS[user.role] ?? 'Usuario';

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-6 lg:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tu rol actual
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{roleLabel}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Accesos rápidos para crear o administrar contenido dentro de NUCLEO.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Correo: {user.email}</span>
            <span>ID: {user.id}</span>
          </div>
        </div>

        {availableActions.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableActions.map((action) => (
              <Link
                key={action.id}
                to={action.to}
                className="group flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary/60"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 transition group-hover:text-primary dark:text-slate-100 dark:group-hover:text-primary">
                    {action.label}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{action.description}</p>
                </div>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary transition group-hover:gap-1 dark:text-primary/90">
                  Ir ahora
                  <svg className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            Tu rol actual solo permite lectura. Si necesitas crear contenido, solicita permisos a un administrador.
          </div>
        )}
      </div>
    </section>
  );
};

export default CreationMenu;
