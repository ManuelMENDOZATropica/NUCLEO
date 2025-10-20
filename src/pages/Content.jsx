import React from 'react';
import { useLocation } from 'react-router-dom';
import { getContentBySlug } from '../lib/contentLoader.js';
import Tag from '../components/Tag.jsx';
import MdxContent from '../components/MdxContent.jsx';

const Content = () => {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '');
  const record = getContentBySlug(slug);

  if (!record) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Contenido no encontrado</h1>
        <p className="text-sm text-slate-500">Aún no tenemos información publicada para esta ruta.</p>
      </div>
    );
  }

  const { Component, title, description, tags, updatedAt } = record;

  return (
    <article className="space-y-6">
      <header className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary">{record.section}</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        </div>
        {description && <p className="text-base text-slate-600 dark:text-slate-300">{description}</p>}
        <div className="flex flex-wrap gap-2">
          {tags?.map((tag) => (
            <Tag key={tag} value={tag} />
          ))}
        </div>
        {updatedAt && (
          <p className="text-xs text-slate-400">Actualizado el {new Date(updatedAt).toLocaleDateString('es-ES')}</p>
        )}
      </header>
      <MdxContent>
        <Component />
      </MdxContent>
    </article>
  );
};

export default Content;
