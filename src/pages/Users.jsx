import React, { useMemo, useState } from 'react';
import CrudButtonGroup from '../components/CrudButtonGroup.jsx';
import { getUsers } from '../lib/data/users.js';

const roleLabels = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Lector',
};

const Users = () => {
  const [lastAction, setLastAction] = useState('');
  const users = useMemo(() => {
    const list = getUsers();
    return list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value));
    } catch (error) {
      console.error('No se pudo formatear la fecha', error);
      return value;
    }
  };

  const handleAction = (actionLabel, context = 'usuarios') => {
    const message = `${actionLabel} · ${context}`;
    setLastAction(message);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-primary">Administración</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Usuarios</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Consulta, agrega y actualiza los miembros del equipo registrados en NUCLEO.
        </p>
      </header>

      <div>
        <CrudButtonGroup
          labels={{ create: 'Agregar', read: 'Consultar', update: 'Actualizar', delete: 'Eliminar' }}
          onCreate={() => handleAction('Agregar')}
          onRead={() => handleAction('Consultar')}
          onUpdate={() => handleAction('Actualizar')}
          onDelete={() => handleAction('Eliminar')}
        />
      </div>

      {lastAction ? (
        <div
          className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary dark:border-primary/30 dark:bg-primary/10"
          role="status"
          aria-live="polite"
        >
          {lastAction}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Nombre
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Correo
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Rol
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Estado
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Actualizado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{user.email}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{roleLabels[user.role] ?? user.role}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(user.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
