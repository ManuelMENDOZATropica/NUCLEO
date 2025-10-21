import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCategories } from '../lib/data/categories.js';
import { canCreate, RESOURCE_TYPES } from '../lib/permissions.js';

const ManageCategories = () => {
  const { user } = useAuth();
  const [newCategory, setNewCategory] = useState({
    id: '',
    name: '',
    description: '',
    status: 'active',
    createdBy: user?.email ?? ''
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');
  const [updateStatus, setUpdateStatus] = useState('active');

  if (!canCreate(user, RESOURCE_TYPES.CATEGORY)) {
    return <Navigate to="/" replace />;
  }

  const categories = getCategories({ includeArchived: true });

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const createPayload = useMemo(() => {
    const slug = newCategory.id ? `categorias/${newCategory.id}` : '';
    const now = new Date().toISOString();
    return {
      ...newCategory,
      slug,
      createdAt: now,
      updatedAt: now
    };
  }, [newCategory]);

  const updatePayload = useMemo(() => {
    if (!selectedCategory) {
      return null;
    }
    return {
      ...selectedCategory,
      description: updateDescription || selectedCategory.description,
      status: updateStatus,
      updatedAt: new Date().toISOString()
    };
  }, [selectedCategory, updateDescription, updateStatus]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Categorías</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestiona las categorías maestras</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Actualiza el archivo <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">data/categories.json</code> para crear, modificar o archivar categorías. Utiliza estos formularios como guía para generar el contenido JSON.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Crear una nueva categoría</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Identificador (usa guiones)
              <input
                type="text"
                value={newCategory.id}
                onChange={(event) => setNewCategory((prev) => ({ ...prev, id: event.target.value.trim().toLowerCase() }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Nombre visible
              <input
                type="text"
                value={newCategory.name}
                onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Descripción
              <textarea
                value={newCategory.description}
                onChange={(event) => setNewCategory((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Estado
              <select
                value={newCategory.status}
                onChange={(event) => setNewCategory((prev) => ({ ...prev, status: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="active">Activa</option>
                <option value="archived">Archivada</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Correo del creador
              <input
                type="email"
                value={newCategory.createdBy}
                onChange={(event) => setNewCategory((prev) => ({ ...prev, createdBy: event.target.value.trim().toLowerCase() }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-slate-900 dark:text-slate-100">JSON sugerido</p>
            <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900/90 p-4 text-xs text-emerald-100">
{JSON.stringify(createPayload, null, 2)}
            </pre>
            <p className="text-slate-600 dark:text-slate-300">
              Copia este bloque dentro de <code>data/categories.json</code> y ejecuta <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">npm run validate:data</code> para confirmar que todo está correcto.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Actualizar o archivar categorías</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Selecciona una categoría existente
              <select
                value={selectedCategoryId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedCategoryId(nextId);
                  const category = categories.find((item) => item.id === nextId);
                  setUpdateDescription(category?.description ?? '');
                  setUpdateStatus(category?.status ?? 'active');
                }}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Selecciona una opción</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.status})
                  </option>
                ))}
              </select>
            </label>
            {selectedCategory && (
              <>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nueva descripción
                  <textarea
                    value={updateDescription}
                    onChange={(event) => setUpdateDescription(event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Estado
                  <select
                    value={updateStatus}
                    onChange={(event) => setUpdateStatus(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="active">Activa</option>
                    <option value="archived">Archivada</option>
                  </select>
                </label>
              </>
            )}
          </div>
          <div className="space-y-3 text-sm">
            {selectedCategory ? (
              <>
                <p className="font-semibold text-slate-900 dark:text-slate-100">JSON actualizado</p>
                <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900/90 p-4 text-xs text-amber-100">
{JSON.stringify(updatePayload, null, 2)}
                </pre>
                <p className="text-slate-600 dark:text-slate-300">
                  Sustituye el bloque correspondiente en <code>data/categories.json</code> y valida los cambios antes de desplegar.
                </p>
              </>
            ) : (
              <p className="text-slate-600 dark:text-slate-300">
                Selecciona una categoría para preparar los cambios de actualización o archivado.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-sm dark:border-rose-600 dark:bg-rose-900/20 dark:text-rose-100">
        <h2 className="text-lg font-semibold">Eliminar una categoría</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>Confirma que todos los posts asociados han sido movidos o eliminados del directorio <code>data/posts</code>.</li>
          <li>Elimina el registro correspondiente en <code>data/categories.json</code>.</li>
          <li>Ejecuta <code className="rounded bg-rose-100 px-1 py-0.5 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100">npm run validate:data</code> para asegurarte de que no queden referencias rotas.</li>
        </ol>
      </section>
    </div>
  );
};

export default ManageCategories;
