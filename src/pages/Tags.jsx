import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { contentIndex } from '../lib/contentLoader.js';
import Tag from '../components/Tag.jsx';

const Tags = () => {
  const { tag } = useParams();
  const normalized = decodeURIComponent(tag ?? '').toLowerCase();
  const items = contentIndex.filter((item) =>
    item.tags?.some((value) => value.toLowerCase() === normalized)
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-primary">Etiqueta</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">#{normalized}</h1>
      </header>

      {items.length === 0 && (
        <p className="text-sm text-slate-500">No hay contenido para esta etiqueta todavía.</p>
      )}

      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <Link to={`/${item.slug}`} className="text-lg font-semibold text-primary">
              {item.title}
            </Link>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags?.map((value) => (
                <Tag key={value} value={value} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Tags;
