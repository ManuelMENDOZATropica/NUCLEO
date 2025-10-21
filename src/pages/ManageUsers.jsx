import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canManageUsers, ROLES } from '../lib/permissions.js';
import { getUsers } from '../lib/data/users.js';

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.VIEWER]: 'Viewer',
};

const ManageUsers = () => {
  const { user } = useAuth();

  if (!canManageUsers(user)) {
    return <Navigate to="/" replace />;
  }

  const users = getUsers();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Usuarios</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestión de usuarios internos</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Actualiza el archivo <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">data/users.json</code> para crear, activar o cambiar los roles del equipo.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Miembros registrados</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Correo
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Rol
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((member) => (
                <tr key={member.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{member.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{member.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-primary dark:bg-primary/20 dark:text-primary">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {member.active ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                        Inactivo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
        <h2 className="text-base font-semibold">Proceso sugerido</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Agrega el nuevo registro en <code>data/users.json</code> con <code>role</code>, <code>email</code> y <code>active</code> en <code>true</code>.
          </li>
          <li>
            Ejecuta <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">npm run validate:data</code> para confirmar que los esquemas siguen siendo válidos.
          </li>
          <li>
            Comparte el cambio mediante un pull request para mantener un historial auditable.
          </li>
        </ol>
      </section>
    </div>
  );
};

export default ManageUsers;
