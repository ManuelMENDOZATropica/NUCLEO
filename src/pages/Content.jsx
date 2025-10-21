import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getContentBySlug } from '../lib/contentLoader.js';
import Tag from '../components/Tag.jsx';
import MdxContent from '../components/MdxContent.jsx';
import CrudButtonGroup from '../components/CrudButtonGroup.jsx';

const Content = () => {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '');
  const record = getContentBySlug(slug);
  const [lastAction, setLastAction] = useState('');

  if (!record) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Contenido no encontrado</h1>
        <p className="text-sm text-slate-500">Aún no tenemos información publicada para esta ruta.</p>
      </div>
    );
  }

  const { Component, title, description, tags, updatedAt } = record;
  const sectionName = useMemo(() => {
    if (!record.section) {
      return 'Contenido general';
    }
    return record.section
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, [record.section]);

  const handleAction = (actionLabel) => {
    const message = `${actionLabel} · ${sectionName}`;
    setLastAction(message);
  };

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
        <CrudButtonGroup
          onCreate={() => handleAction('Crear')}
          onRead={() => handleAction('Consultar')}
          onUpdate={() => handleAction('Actualizar')}
          onDelete={() => handleAction('Eliminar')}
        />
        {lastAction ? (
          <div
            className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary dark:border-primary/30 dark:bg-primary/10"
            role="status"
            aria-live="polite"
          >
            {lastAction}
          </div>
        ) : null}
      </header>
      <MdxContent>
        <Component />
      </MdxContent>
    </article>
  );
};

export default Content;
