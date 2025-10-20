import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSectionList } from '../lib/contentLoader.js';

const sections = getSectionList();

const Sidebar = ({ isOpen, onNavigate }) => {
  const location = useLocation();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white p-6 transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 lg:static lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <nav className="space-y-8 text-sm">
        {sections.map((section) => (
          <div key={section.key}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {section.title}
            </h2>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const href = `/${item.slug}`;
                const isActive = location.pathname === href;
                return (
                  <li key={item.id}>
                    <Link
                      to={href}
                      onClick={onNavigate}
                      className={`block rounded-md px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-slate-900 ${
                        isActive
                          ? 'bg-slate-100 font-medium text-primary dark:bg-slate-900'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
