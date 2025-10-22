import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canCreate, RESOURCE_TYPES } from '../lib/permissions.js';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from '../services/categories.js';

const STATUS_LABELS = {
  active: 'Activa',
  archived: 'Archivada'
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_NAME_LENGTH = 3;
const MIN_DESCRIPTION_LENGTH = 10;

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function normalizeId(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

const ManageCategories = () => {
  const { user } = useAuth();
  const defaultCreatedBy = useMemo(() => user?.email?.toLowerCase() ?? '', [user?.email]);

  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [newCategory, setNewCategory] = useState({
    id: '',
    name: '',
    description: '',
    status: 'active',
    createdBy: defaultCreatedBy
  });

  useEffect(() => {
    setNewCategory((prev) => {
      if (prev.createdBy) {
        return prev;
      }
      return { ...prev, createdBy: defaultCreatedBy };
    });
  }, [defaultCreatedBy]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listCategories();
      const sorted = data
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
      setCategories(sorted);
      setDrafts(
        sorted.reduce((acc, category) => {
          acc[category.id] = { ...category };
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  if (!canCreate(user, RESOURCE_TYPES.CATEGORY)) {
    return <Navigate to="/" replace />;
  }

  const handleNewCategoryChange = (field) => (event) => {
    let { value } = event.target;
    if (field === 'id') {
      value = normalizeId(value);
    }
    if (field === 'createdBy') {
      value = value.trim().toLowerCase();
    }
    setNewCategory((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const resetNewCategory = () => {
    setNewCategory({
      id: '',
      name: '',
      description: '',
      status: 'active',
      createdBy: defaultCreatedBy
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const id = normalizeId(newCategory.id);
    const name = newCategory.name.trim();
    const description = newCategory.description.trim();
    const createdBy = newCategory.createdBy.trim().toLowerCase();
    const status = newCategory.status;

    if (!id || !name || !description || !createdBy) {
      setError('Completa todos los campos obligatorios para crear una categoría.');
      return;
    }

    if (name.length < MIN_NAME_LENGTH) {
      setError(`El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres.`);
      return;
    }

    if (description.length < MIN_DESCRIPTION_LENGTH) {
      setError(`La descripción debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres.`);
      return;
    }

    if (!EMAIL_REGEX.test(createdBy)) {
      setError('Introduce un correo electrónico válido para el campo "Creado por".');
      return;
    }

    setCreating(true);
    try {
      await createCategory({
        id,
        name,
        description,
        status,
        createdBy
      });
      setSuccessMessage('Categoría creada correctamente.');
      resetNewCategory();
      await loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDraftChange = (categoryId, field) => (event) => {
    const { value } = event.target;
    setDrafts((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] ?? categories.find((item) => item.id === categoryId) ?? {}),
        [field]: value
      }
    }));
  };

  const handleResetDraft = (categoryId) => {
    const original = categories.find((category) => category.id === categoryId);
    if (!original) {
      return;
    }
    setDrafts((prev) => ({
      ...prev,
      [categoryId]: { ...original }
    }));
  };

  const handleSave = async (categoryId) => {
    const draft = drafts[categoryId];
    const original = categories.find((category) => category.id === categoryId);
    if (!draft || !original) {
      return;
    }

    const name = draft.name.trim();
    const description = draft.description.trim();
    const status = draft.status;

    if (!name || name.length < MIN_NAME_LENGTH) {
      setError(`El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres.`);
      return;
    }

    if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
      setError(`La descripción debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres.`);
      return;
    }

    if (original.status !== 'archived' && status === 'archived') {
      const shouldArchive = window.confirm(
        `¿Seguro que deseas archivar la categoría "${original.name}"? Los posts asociados permanecerán intactos.`
      );
      if (!shouldArchive) {
        setDrafts((prev) => ({
          ...prev,
          [categoryId]: { ...prev[categoryId], status: original.status }
        }));
        return;
      }
    }

    setSavingId(categoryId);
    setError('');
    setSuccessMessage('');
    try {
      await updateCategory(categoryId, {
        name,
        description,
        status
      });
      setSuccessMessage('Categoría actualizada correctamente.');
      await loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId('');
    }
  };

  const handleDelete = async (category) => {
    const shouldDelete = window.confirm(
      `¿Seguro que deseas eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingId(category.id);
    setError('');
    setSuccessMessage('');
    try {
      await deleteCategory(category.id);
      setSuccessMessage('Categoría eliminada correctamente.');
      await loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Categorías</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestiona las categorías maestras</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Crea, edita y archiva categorías directamente desde esta vista. Todos los cambios se guardan en la API y se
          reflejan de inmediato en <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">data/categories.json</code>.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          {successMessage}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Crear una nueva categoría</h2>
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Identificador (usa guiones)
              <input
                type="text"
                value={newCategory.id}
                onChange={handleNewCategoryChange('id')}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Nombre visible
              <input
                type="text"
                value={newCategory.name}
                onChange={handleNewCategoryChange('name')}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Descripción
              <textarea
                value={newCategory.description}
                onChange={handleNewCategoryChange('description')}
                rows={4}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Estado
              <select
                value={newCategory.status}
                onChange={handleNewCategoryChange('status')}
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
                onChange={handleNewCategoryChange('createdBy')}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
          <div className="flex flex-col justify-between space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Utiliza este formulario para crear categorías que luego se asignarán a publicaciones y posts. El identificador
              debe ser único y en minúsculas.
            </p>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creating ? 'Guardando...' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Categorías existentes</h2>
          {loading && <span className="text-sm text-slate-500 dark:text-slate-400">Cargando...</span>}
        </div>
        {!loading && categories.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Todavía no hay categorías registradas.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => {
              const draft = drafts[category.id] ?? category;
              const isSaving = savingId === category.id;
              const isDeleting = deletingId === category.id;
              return (
                <article
                  key={category.id}
                  className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/60 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="space-y-4">
                    <header className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">{category.id}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Slug: {category.slug}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Creada por {category.createdBy} · {formatDate(category.createdAt)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Actualizada {formatDate(category.updatedAt)}
                      </p>
                    </header>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Nombre visible
                      <input
                        type="text"
                        value={draft.name}
                        onChange={handleDraftChange(category.id, 'name')}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Descripción
                      <textarea
                        value={draft.description}
                        onChange={handleDraftChange(category.id, 'description')}
                        rows={4}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Estado
                      <select
                        value={draft.status}
                        onChange={handleDraftChange(category.id, 'status')}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <footer className="mt-6 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(category.id)}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetDraft(category.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Restablecer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      disabled={isDeleting}
                      className="ml-auto inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/30"
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Estado actual: {STATUS_LABELS[category.status] ?? category.status}
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default ManageCategories;
