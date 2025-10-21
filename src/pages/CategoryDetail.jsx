import React, { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCategoryById } from '../lib/data/categories.js';
import {
  getPostsByCategory,
  getPublishedPostsByCategory,
  getEditablePostsForUser
} from '../lib/data/posts.js';
import { canCreate, canPublish, RESOURCE_TYPES } from '../lib/permissions.js';

const statusStyles = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  review: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200'
};

const CategoryDetail = () => {
  const { categoryId } = useParams();
  const category = getCategoryById(categoryId);
  const { user } = useAuth();

  if (!category) {
    return <Navigate to="/categorias" replace />;
  }

  const publishedPosts = getPublishedPostsByCategory(category.id);
  const allPosts = getPostsByCategory(category.id);
  const editablePosts = user ? getEditablePostsForUser(user, category.id) : [];

  const draftPosts = useMemo(() => {
    if (!user) {
      return [];
    }

    const editableIds = new Set(editablePosts.map((post) => post.id));
    return allPosts.filter((post) => post.status !== 'published' && editableIds.has(post.id));
  }, [allPosts, editablePosts, user]);

  const canManagePosts = Boolean(user && canCreate(user, RESOURCE_TYPES.POST));
  const canAdminPosts = Boolean(user && canPublish(user, RESOURCE_TYPES.POST));

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Categoría</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{category.name}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{category.description}</p>
        {(canManagePosts || canAdminPosts) && (
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              to="/categorias/gestionar"
              className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-3 py-2 font-medium text-primary transition hover:bg-primary/20 dark:border-primary/60 dark:bg-primary/20"
            >
              Gestionar posts de la categoría
            </Link>
          </div>
        )}
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Posts publicados</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">{publishedPosts.length} visibles</span>
        </div>
        {publishedPosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            Aún no hay posts publicados en esta categoría.
          </div>
        ) : (
          <ul className="space-y-3">
            {publishedPosts.map((post) => (
              <li
                key={post.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{post.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{post.summary}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    statusStyles[post.status] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                  >
                    {post.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>Autor: {post.authorEmail}</span>
                  <span>Actualizado: {new Date(post.updatedAt).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {draftPosts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Borradores y revisión</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">Solo visible para tu equipo</span>
          </div>
          <ul className="space-y-3">
            {draftPosts.map((post) => (
              <li
                key={post.id}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-100"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold">{post.title}</p>
                    <p className="text-sm opacity-80">{post.summary}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    statusStyles[post.status] ?? ''
                  }`}
                  >
                    {post.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-80">
                  <span>Autor: {post.authorEmail}</span>
                  <span>Última edición: {new Date(post.updatedAt).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default CategoryDetail;
