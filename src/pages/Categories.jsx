import React from 'react';
import { Link } from 'react-router-dom';
import { getCategories } from '../lib/data/categories.js';
import { getPublishedPostsByCategory } from '../lib/data/posts.js';

const categories = getCategories();

const Categories = () => {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Categorías</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Explora las categorías de contenido</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Cada categoría agrupa procesos, tutoriales y documentación relacionada. Selecciona una categoría para ver los posts publicados.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => {
          const publishedPosts = getPublishedPostsByCategory(category.id);
          return (
            <Link
              key={category.id}
              to={`/${category.slug}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 transition group-hover:text-primary dark:text-slate-100 dark:group-hover:text-primary">
                    {category.name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{category.description}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {publishedPosts.length} post{publishedPosts.length === 1 ? '' : 's'}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Categories;
