import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCategories, getCategoryOptions } from '../lib/data/categories.js';
import { canCreate, canPublish, RESOURCE_TYPES } from '../lib/permissions.js';
import { createPost, deletePost, listPosts, updatePost } from '../services/posts.js';

const ManagePosts = () => {
  const { user } = useAuth();

  if (!canCreate(user, RESOURCE_TYPES.POST)) {
    return <Navigate to="/" replace />;
  }

  const categories = useMemo(() => getCategories(), []);
  const categoryOptions = useMemo(() => getCategoryOptions(), []);
  const firstCategoryId = categoryOptions[0]?.value ?? '';
  const canApprove = canPublish(user, RESOURCE_TYPES.POST);

  const makeEmptyForm = useCallback(
    () => ({
      id: '',
      categoryId: firstCategoryId,
      title: '',
      summary: '',
      body: '',
      status: 'draft',
      authorEmail: user?.email ?? '',
      publishedAt: ''
    }),
    [firstCategoryId, user?.email]
  );

  const [editingPostId, setEditingPostId] = useState('');
  const [form, setForm] = useState(makeEmptyForm);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    if (!editingPostId) {
      setForm(makeEmptyForm());
    }
  }, [editingPostId, makeEmptyForm]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listPosts();
      const normalizedEmail = user?.email?.toLowerCase() ?? '';
      const visiblePosts = canApprove
        ? data
        : data.filter((post) => post.authorEmail?.toLowerCase() === normalizedEmail);
      const sortedPosts = visiblePosts
        .slice()
        .sort((a, b) => {
          const dateA = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
          const dateB = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
          return dateB - dateA;
        });
      setPosts(sortedPosts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [canApprove, user?.email]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    let nextValue = value;
    if (field === 'id') {
      nextValue = value.trim().toLowerCase();
    }
    if (field === 'authorEmail') {
      nextValue = value.trim().toLowerCase();
    }
    if (field === 'publishedAt') {
      nextValue = value.trim();
    }

    setForm((prev) => ({
      ...prev,
      [field]: nextValue
    }));
  };

  const handleStatusChange = (event) => {
    const { value } = event.target;
    setForm((prev) => ({
      ...prev,
      status: value,
      publishedAt: value === 'published' ? prev.publishedAt || new Date().toISOString() : ''
    }));
  };

  const handleEdit = (post) => {
    setError('');
    setSuccessMessage('');
    setEditingPostId(post.id);
    setForm({
      id: post.id,
      categoryId: post.categoryId,
      title: post.title,
      summary: post.summary,
      body: post.body,
      status: post.status,
      authorEmail: post.authorEmail,
      publishedAt: post.publishedAt ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingPostId('');
    setError('');
    setSuccessMessage('');
    setForm(makeEmptyForm());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');

    const payload = {
      categoryId: form.categoryId,
      title: form.title,
      summary: form.summary,
      body: form.body,
      status: form.status,
      authorEmail: form.authorEmail
    };

    if (form.status === 'published') {
      payload.publishedAt = form.publishedAt ? form.publishedAt : new Date().toISOString();
    }

    try {
      if (editingPostId) {
        await updatePost(editingPostId, payload);
        setSuccessMessage('Post actualizado correctamente.');
        setEditingPostId('');
      } else {
        if (form.id) {
          payload.id = form.id;
        }
        await createPost(payload);
        setSuccessMessage('Post creado correctamente.');
      }
      await loadPosts();
      setForm(makeEmptyForm());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post) => {
    const shouldDelete = window.confirm(
      `¿Seguro que deseas eliminar el post "${post.title}" de la categoría ${post.categoryId}?`
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingId(post.id);
    setError('');
    setSuccessMessage('');
    try {
      await deletePost(post.id);
      if (editingPostId === post.id) {
        setEditingPostId('');
        setForm(makeEmptyForm());
      }
      await loadPosts();
      setSuccessMessage('Post eliminado correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId('');
    }
  };

  const postsByCategory = useMemo(() => {
    const grouped = new Map();

    posts.forEach((post) => {
      const key = post.categoryId || 'sin-categoria';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(post);
    });

    categories.forEach((category) => {
      if (!grouped.has(category.id)) {
        grouped.set(category.id, []);
      }
    });

    return Array.from(grouped.entries())
      .map(([categoryId, categoryPosts]) => {
        const category = categories.find((item) => item.id === categoryId) ?? null;
        const sortedPosts = categoryPosts.slice().sort((a, b) => {
          const dateA = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
          const dateB = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
          return dateB - dateA;
        });
        return { categoryId, category, posts: sortedPosts };
      })
      .sort((a, b) => {
        const nameA = a.category?.name ?? a.categoryId;
        const nameB = b.category?.name ?? b.categoryId;
        return nameA.localeCompare(nameB, 'es');
      });
  }, [categories, posts]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Posts por categoría</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Crea y administra posts</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Gestiona los posts a través de la API disponible en <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">/api/posts</code>.
          Todos los cambios se guardan en <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">data/posts/posts.json</code> para
          mantener un historial auditable.
        </p>
      </header>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {editingPostId ? 'Editar post' : 'Crear un nuevo post'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Completa los campos y confirma la acción para sincronizar los cambios con el servidor.
          </p>
        </div>

        {(error || successMessage) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              error
                ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-600 dark:bg-rose-900/40 dark:text-rose-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-100'
            }`}
          >
            {error || successMessage}
          </div>
        )}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Categoría
              <select
                value={form.categoryId}
                onChange={handleChange('categoryId')}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                required
              >
                <option value="">Selecciona una categoría</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Identificador
              <input
                type="text"
                value={form.id}
                onChange={handleChange('id')}
                disabled={Boolean(editingPostId)}
                placeholder="Opcional"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-800/40"
              />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Si se omite, se generará un identificador automáticamente.
              </span>
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Título
              <input
                type="text"
                value={form.title}
                onChange={handleChange('title')}
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Resumen
              <textarea
                value={form.summary}
                onChange={handleChange('summary')}
                rows={4}
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Estado
              <select
                value={form.status}
                onChange={handleStatusChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="draft">Borrador</option>
                <option value="review">Revisión</option>
                <option value="published" disabled={!canApprove && form.status !== 'published'}>
                  Publicado {canApprove ? '' : '(solo administradores)'}
                </option>
              </select>
            </label>

            {form.status === 'published' && (
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Fecha de publicación (ISO)
                <input
                  type="text"
                  value={form.publishedAt}
                  onChange={handleChange('publishedAt')}
                  placeholder="2024-03-01T12:00:00.000Z"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            )}

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Autor
              <input
                type="email"
                value={form.authorEmail}
                onChange={handleChange('authorEmail')}
                required
                disabled={!canApprove}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-800/40"
              />
              {!canApprove && (
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Usa tu correo institucional. Los administradores pueden reasignar posts si es necesario.
                </span>
              )}
            </label>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Cuerpo del post
              <textarea
                value={form.body}
                onChange={handleChange('body')}
                rows={12}
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              {editingPostId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-primary/60"
              >
                {saving ? 'Guardando…' : editingPostId ? 'Actualizar post' : 'Crear post'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Posts disponibles</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Revisa y gestiona los posts agrupados por categoría. Usa los botones para editar o eliminar rápidamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingPostId('');
              setError('');
              setSuccessMessage('');
              setForm(makeEmptyForm());
            }}
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Nuevo post
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Cargando posts…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Aún no hay posts registrados para tu usuario.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {postsByCategory.map(({ categoryId, category, posts: categoryPosts }) => (
              <article
                key={categoryId}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <header className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {category?.name ?? `Categoría: ${categoryId}`}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {categoryPosts.length} {categoryPosts.length === 1 ? 'post' : 'posts'}
                    </p>
                  </div>
                </header>

                {categoryPosts.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No hay posts en esta categoría.</p>
                ) : (
                  <ul className="space-y-3">
                    {categoryPosts.map((post) => (
                      <li
                        key={post.id}
                        className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm transition hover:border-primary hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{post.title}</h4>
                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {post.status}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{post.summary}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Autor: {post.authorEmail}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Actualizado: {post.updatedAt ? new Date(post.updatedAt).toLocaleString() : 'Sin registrar'}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(post)}
                              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(post)}
                              disabled={deletingId === post.id}
                              className="inline-flex items-center justify-center rounded-md border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-700 dark:text-rose-200 dark:hover:bg-rose-900/40"
                            >
                              {deletingId === post.id ? 'Eliminando…' : 'Eliminar'}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ManagePosts;
