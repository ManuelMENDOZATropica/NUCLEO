import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSectionList } from '../lib/contentLoader.js';

const sections = getSectionList().filter((section) => section.key && section.key !== 'general');

const CategoryMenu = () => {
  const location = useLocation();

  if (sections.length === 0) {
    return null;
  }

  return (
    <nav className="hidden border-t border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 lg:block">
      <div className="mx-auto max-w-6xl px-4">
        <ul className="flex items-center gap-2 overflow-x-auto py-2 text-sm text-slate-600 dark:text-slate-300">
          {sections.map((section) => {
            const href = section.slug ? `/${section.slug}` : '/';
            const isActive = location.pathname === href;
            return (
              <li key={section.key}>
                <Link
                  to={href}
                  className={`inline-flex items-center rounded-full px-3 py-1.5 transition ${
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {section.title}
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
