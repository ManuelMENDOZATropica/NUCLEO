import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canCreate, canPublish, RESOURCE_TYPES } from '../lib/permissions.js';
import {
  createPublication,
  deletePublication,
  listPublications,
  updatePublication
} from '../services/publications.js';

const DEFAULT_SECTION = 'publicaciones';

function createEmptyForm(authorEmail = '') {
  return {
    id: '',
    slug: '',
    title: '',
    summary: '',
    body: '',
    tagsText: '',
    status: 'draft',
    authorEmail,
    publishedAt: ''
  };
}

function parseTags(text) {
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDate(iso) {
  if (!iso) {
    return '–';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

const CreatePublication = () => {
  const { user } = useAuth();
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [createForm, setCreateForm] = useState(() => createEmptyForm(user?.email ?? ''));
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canUserCreate = canCreate(user, RESOURCE_TYPES.PUBLICATION);
  const canUserPublish = canPublish(user, RESOURCE_TYPES.PUBLICATION);

  useEffect(() => {
    setCreateForm((prev) => ({ ...prev, authorEmail: user?.email ?? '' }));
  }, [user?.email]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await listPublications();
        if (isMounted) {
          setPublications(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message ?? 'No se pudieron cargar las publicaciones.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!editId) {
      setEditForm(null);
      return;
    }

    const selected = publications.find((publication) => publication.id === editId);
    if (!selected) {
      setEditForm(null);
      return;
    }

    setEditForm({
      id: selected.id,
      slug: selected.slug ?? '',
      title: selected.title ?? '',
      summary: selected.summary ?? '',
      body: selected.body ?? '',
      tagsText: Array.isArray(selected.tags) ? selected.tags.join(', ') : '',
      status: selected.status ?? 'draft',
      authorEmail: selected.authorEmail ?? '',
      publishedAt: selected.publishedAt ?? ''
    });
  }, [editId, publications]);

  const sortedPublications = useMemo(() => {
    return [...publications].sort((a, b) => {
      const aDate = new Date(a.updatedAt ?? 0).getTime();
      const bDate = new Date(b.updatedAt ?? 0).getTime();
      return bDate - aDate;
    });
  }, [publications]);

  if (!canUserCreate) {
    return <Navigate to="/" replace />;
  }

  const handleCreateChange = (field) => (event) => {
    setCreateForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleEditChange = (field) => (event) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: event.target.value } : prev));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setError('');
    setFeedback('');

    const trimmedId = createForm.id.trim();
    const trimmedTitle = createForm.title.trim();
    const trimmedSummary = createForm.summary.trim();
    const trimmedBody = createForm.body.trim();
    const trimmedAuthor = createForm.authorEmail.trim();

    if (!trimmedId || !trimmedTitle || !trimmedSummary || !trimmedBody || !trimmedAuthor) {
      setError('Completa los campos obligatorios antes de crear la publicación.');
      return;
    }

    const payload = {
      id: trimmedId,
      slug: createForm.slug.trim(),
      title: trimmedTitle,
      summary: trimmedSummary,
      body: trimmedBody,
      tags: parseTags(createForm.tagsText),
      status: createForm.status,
      authorEmail: trimmedAuthor,
      section: DEFAULT_SECTION,
      publishedAt: createForm.publishedAt.trim() || undefined
    };

    setSubmitting(true);
    try {
      const created = await createPublication(payload);
      setPublications((prev) => [...prev, created]);
      setCreateForm(createEmptyForm(user?.email ?? ''));
      setFeedback('Publicación creada correctamente.');
    } catch (createError) {
      setError(createError.message ?? 'No fue posible crear la publicación.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editForm || submitting) {
      return;
    }

    setError('');
    setFeedback('');

    const trimmedTitle = editForm.title.trim();
    const trimmedSummary = editForm.summary.trim();
    const trimmedBody = editForm.body.trim();
    const trimmedAuthor = editForm.authorEmail.trim();

    if (!trimmedTitle || !trimmedSummary || !trimmedBody || !trimmedAuthor) {
      setError('Completa los campos obligatorios antes de actualizar la publicación.');
      return;
    }

    const payload = {
      title: trimmedTitle,
      summary: trimmedSummary,
      body: trimmedBody,
      slug: editForm.slug.trim(),
      tags: parseTags(editForm.tagsText),
      status: editForm.status,
      authorEmail: trimmedAuthor,
      section: DEFAULT_SECTION,
      publishedAt: editForm.publishedAt.trim() || undefined
    };

    setSubmitting(true);
    try {
      const updated = await updatePublication(editForm.id, payload);
      setPublications((prev) =>
        prev.map((publication) => (publication.id === updated.id ? updated : publication))
      );
      setFeedback('Publicación actualizada correctamente.');
    } catch (updateError) {
      setError(updateError.message ?? 'No fue posible actualizar la publicación.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editForm || submitting) {
      return;
    }

    const confirmed = window.confirm(
      `¿Quieres eliminar la publicación “${editForm.title || editForm.id}”?`
    );
    if (!confirmed) {
      return;
    }

    setError('');
    setFeedback('');
    setSubmitting(true);

    try {
      await deletePublication(editForm.id);
      setPublications((prev) => prev.filter((publication) => publication.id !== editForm.id));
      setEditId('');
      setEditForm(null);
      setFeedback('Publicación eliminada correctamente.');
    } catch (deleteError) {
      setError(deleteError.message ?? 'No fue posible eliminar la publicación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Publicaciones</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Gestor de publicaciones
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Crea, actualiza y elimina publicaciones internas con persistencia en la API JSON.
        </p>
      </header>

      {feedback ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Publicaciones registradas
          </h2>
          {loading ? (
            <span className="text-xs font-medium text-slate-500">Cargando…</span>
          ) : (
            <span className="text-xs font-medium text-slate-500">
              {publications.length} {publications.length === 1 ? 'registro' : 'registros'}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/30">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">ID</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Título
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Estado
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Autor
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Actualización
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedPublications.map((publication) => (
                <tr key={publication.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{publication.id}</td>
                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{publication.title}</td>
                  <td className="px-3 py-2 capitalize text-slate-600 dark:text-slate-300">
                    {publication.status}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {publication.authorEmail}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(publication.updatedAt)}</td>
                </tr>
              ))}
              {!sortedPublications.length && !loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Aún no hay publicaciones registradas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Crear una publicación
          </h2>
          <span className="text-xs font-medium text-slate-500">Campos obligatorios *</span>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Identificador *
            <input
              type="text"
              value={createForm.id}
              onChange={handleCreateChange('id')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Slug
            <input
              type="text"
              value={createForm.slug}
              onChange={handleCreateChange('slug')}
              placeholder={`publicaciones/${createForm.id || 'identificador'}`}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Título *
            <input
              type="text"
              value={createForm.title}
              onChange={handleCreateChange('title')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Autor *
            <input
              type="email"
              value={createForm.authorEmail}
              onChange={handleCreateChange('authorEmail')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Resumen *
            <textarea
              value={createForm.summary}
              onChange={handleCreateChange('summary')}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Contenido *
            <textarea
              value={createForm.body}
              onChange={handleCreateChange('body')}
              rows={6}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Tags (separados por coma)
            <input
              type="text"
              value={createForm.tagsText}
              onChange={handleCreateChange('tagsText')}
              placeholder="estrategia, actualizaciones"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Estado
            <select
              value={createForm.status}
              onChange={handleCreateChange('status')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="draft">Borrador</option>
              <option value="review">Revisión</option>
              <option value="published" disabled={!canUserPublish}>
                Publicado
              </option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Fecha de publicación (ISO)
            <input
              type="text"
              value={createForm.publishedAt}
              onChange={handleCreateChange('publishedAt')}
              placeholder="2024-06-01T12:00:00.000Z"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-primary/50"
            >
              {submitting ? 'Guardando…' : 'Crear publicación'}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Actualizar o eliminar
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Selecciona una publicación para editarla o eliminarla
          </span>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleUpdate}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Selecciona una publicación
            <select
              value={editId}
              onChange={(event) => setEditId(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">— Selecciona —</option>
              {sortedPublications.map((publication) => (
                <option key={publication.id} value={publication.id}>
                  {publication.title} ({publication.id})
                </option>
              ))}
            </select>
          </label>

          {editForm ? (
            <>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Slug
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={handleEditChange('slug')}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Título *
                <input
                  type="text"
                  value={editForm.title}
                  onChange={handleEditChange('title')}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Autor *
                <input
                  type="email"
                  value={editForm.authorEmail}
                  onChange={handleEditChange('authorEmail')}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Estado
                <select
                  value={editForm.status}
                  onChange={handleEditChange('status')}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="draft">Borrador</option>
                  <option value="review">Revisión</option>
                  <option value="published" disabled={!canUserPublish}>
                    Publicado
                  </option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
                Resumen *
                <textarea
                  value={editForm.summary}
                  onChange={handleEditChange('summary')}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
                Contenido *
                <textarea
                  value={editForm.body}
                  onChange={handleEditChange('body')}
                  rows={6}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Tags (separados por coma)
                <input
                  type="text"
                  value={editForm.tagsText}
                  onChange={handleEditChange('tagsText')}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Fecha de publicación (ISO)
                <input
                  type="text"
                  value={editForm.publishedAt}
                  onChange={handleEditChange('publishedAt')}
                  placeholder="2024-06-01T12:00:00.000Z"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  {submitting ? 'Guardando…' : 'Actualizar publicación'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:bg-red-100"
                >
                  Eliminar publicación
                </button>
              </div>
            </>
          ) : (
            <p className="md:col-span-2 text-sm text-slate-500 dark:text-slate-400">
              Selecciona una publicación para editar sus datos.
            </p>
          )}
        </form>
      </section>
    </div>
  );
};

export default CreatePublication;
