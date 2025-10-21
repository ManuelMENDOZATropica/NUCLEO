import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCategories } from '../lib/data/categories.js';

const categories = getCategories();

const CategoryMenu = () => {
  const location = useLocation();

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav className="hidden border-t border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 lg:block">
      <div className="mx-auto max-w-6xl px-4">
        <ul className="flex items-center gap-2 overflow-x-auto py-2 text-sm text-slate-600 dark:text-slate-300">
          <li key="categorias-all">
            <Link
              to="/categorias"
              className={`inline-flex items-center rounded-full px-3 py-1.5 transition ${
                location.pathname === '/categorias'
                  ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/20'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              Todas las categorías
            </Link>
          </li>
          {categories.map((category) => {
            const href = `/${category.slug}`;
            const isActive = location.pathname === href;
            return (
              <li key={category.id}>
                <Link
                  to={href}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {category.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default CategoryMenu;
