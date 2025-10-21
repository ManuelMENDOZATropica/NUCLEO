import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCategories, getCategoryOptions } from '../lib/data/categories.js';
import { getEditablePostsForUser, getPosts } from '../lib/data/posts.js';
import { canCreate, canPublish, RESOURCE_TYPES } from '../lib/permissions.js';

const ManagePosts = () => {
  const { user } = useAuth();

  if (!canCreate(user, RESOURCE_TYPES.POST)) {
    return <Navigate to="/" replace />;
  }

  const categories = getCategories();
  const categoryOptions = getCategoryOptions();
  const firstCategoryId = categoryOptions[0]?.value ?? '';

  const [postForm, setPostForm] = useState({
    id: '',
    title: '',
    summary: '',
    body: '',
    status: 'draft',
    categoryId: firstCategoryId,
    authorEmail: user?.email ?? ''
  });
  const [selectedPostId, setSelectedPostId] = useState('');
  const [updateStatus, setUpdateStatus] = useState('draft');
  const [updateSummary, setUpdateSummary] = useState('');
  const [updateBody, setUpdateBody] = useState('');

  useEffect(() => {
    setPostForm((prev) => ({
      ...prev,
      categoryId: prev.categoryId || firstCategoryId,
      authorEmail: user?.email ?? ''
    }));
  }, [firstCategoryId, user?.email]);

  const editablePosts = useMemo(() => getEditablePostsForUser(user), [user]);
  const selectedPost = useMemo(
    () => editablePosts.find((post) => post.id === selectedPostId) ?? null,
    [editablePosts, selectedPostId]
  );

  useEffect(() => {
    if (selectedPost) {
      setUpdateStatus(selectedPost.status);
      setUpdateSummary(selectedPost.summary);
      setUpdateBody(selectedPost.body);
    }
  }, [selectedPost]);

  const createPayload = useMemo(() => {
    const now = new Date().toISOString();
    const slug = postForm.id && postForm.categoryId ? `categorias/${postForm.categoryId}/${postForm.id}` : '';
    const payload = {
      id: postForm.id,
      categoryId: postForm.categoryId,
      slug,
      title: postForm.title,
      summary: postForm.summary,
      body: postForm.body,
      status: postForm.status,
      authorEmail: postForm.authorEmail,
      createdAt: now,
      updatedAt: now
    };

    if (postForm.status === 'published') {
      payload.publishedAt = now;
    }

    return payload;
  }, [postForm]);

  const updatePayload = useMemo(() => {
    if (!selectedPost) {
      return null;
    }
    const now = new Date().toISOString();
    const payload = {
      ...selectedPost,
      summary: updateSummary,
      body: updateBody,
      status: updateStatus,
      updatedAt: now
    };

    if (updateStatus === 'published') {
      payload.publishedAt = payload.publishedAt ?? now;
    } else {
      delete payload.publishedAt;
    }

    return payload;
  }, [selectedPost, updateBody, updateStatus, updateSummary]);

  const canApprove = canPublish(user, RESOURCE_TYPES.POST);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Posts por categoría</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Crea y administra posts</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Los posts se almacenan como archivos JSON dentro de <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">data/posts</code>. Completa el formulario para generar los datos requeridos según tu rol.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Crear un nuevo post</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Categoría
              <select
                value={postForm.categoryId}
                onChange={(event) => setPostForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Identificador del post
              <input
                type="text"
                value={postForm.id}
                onChange={(event) => setPostForm((prev) => ({ ...prev, id: event.target.value.trim().toLowerCase() }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                El archivo recomendado sería <code>data/posts/{postForm.categoryId || 'categoria'}/{postForm.id || 'slug'}.json</code>
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Título
              <input
                type="text"
                value={postForm.title}
                onChange={(event) => setPostForm((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Resumen
              <textarea
                value={postForm.summary}
                onChange={(event) => setPostForm((prev) => ({ ...prev, summary: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Cuerpo del post
              <textarea
                value={postForm.body}
                onChange={(event) => setPostForm((prev) => ({ ...prev, body: event.target.value }))}
                rows={6}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Estado
              <select
                value={postForm.status}
                onChange={(event) => setPostForm((prev) => ({ ...prev, status: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="draft">Borrador</option>
                <option value="review">Revisión</option>
                <option value="published">Publicado</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Autor
              <input
                type="email"
                value={postForm.authorEmail}
                onChange={(event) => setPostForm((prev) => ({ ...prev, authorEmail: event.target.value.trim().toLowerCase() }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-slate-900 dark:text-slate-100">JSON sugerido</p>
            <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900/90 p-4 text-xs text-emerald-100">
{JSON.stringify(createPayload, null, 2)}
            </pre>
            <p className="text-slate-600 dark:text-slate-300">
              Guarda el archivo en el directorio indicado y ejecuta <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">npm run validate:data</code> para comprobar el esquema.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Actualizar un post existente</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Selecciona un post editable
              <select
                value={selectedPostId}
                onChange={(event) => setSelectedPostId(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Selecciona una opción</option>
                {editablePosts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.title} — {post.status}
                  </option>
                ))}
              </select>
            </label>
            {selectedPost ? (
              <>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nuevo estado
                  <select
                    value={updateStatus}
                    onChange={(event) => setUpdateStatus(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="draft">Borrador</option>
                    <option value="review">Revisión</option>
                    <option value="published">Publicado</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Resumen
                  <textarea
                    value={updateSummary}
                    onChange={(event) => setUpdateSummary(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Contenido
                  <textarea
                    value={updateBody}
                    onChange={(event) => setUpdateBody(event.target.value)}
                    rows={6}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Selecciona un post para generar el bloque actualizado.
              </p>
            )}
          </div>
          <div className="space-y-3 text-sm">
            {selectedPost ? (
              <>
                <p className="font-semibold text-slate-900 dark:text-slate-100">JSON actualizado</p>
                <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900/90 p-4 text-xs text-amber-100">
{JSON.stringify(updatePayload, null, 2)}
                </pre>
                {canApprove ? (
                  <p className="text-slate-600 dark:text-slate-300">
                    Como administrador puedes publicar el post cambiando el estado a <code>published</code> y confirmando la fecha <code>publishedAt</code>.
                  </p>
                ) : (
                  <p className="text-slate-600 dark:text-slate-300">
                    Una vez listo el contenido, comparte el archivo con un administrador para su publicación.
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-600 dark:text-slate-300">
                No se ha seleccionado ningún post editable.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-sm dark:border-rose-600 dark:bg-rose-900/20 dark:text-rose-100">
        <h2 className="text-lg font-semibold">Eliminar un post</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>Elimina el archivo correspondiente del directorio <code>data/posts/&lt;categoria&gt;</code>.</li>
          <li>Ejecuta <code className="rounded bg-rose-100 px-1 py-0.5 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100">npm run validate:data</code> para verificar que no existan referencias pendientes.</li>
          <li>Incluye el cambio en un pull request para mantener el historial auditable.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Posts disponibles</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Título
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Categoría
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Autor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {getPosts().map((post) => {
                const categoryLabel = categories.find((category) => category.id === post.categoryId)?.name ?? post.categoryId;
                return (
                  <tr key={post.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{post.title}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{categoryLabel}</td>
                    <td className="px-4 py-3">{post.status}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{post.authorEmail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ManagePosts;
