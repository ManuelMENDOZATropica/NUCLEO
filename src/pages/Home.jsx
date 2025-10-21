import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { contentIndex, getSectionList } from '../lib/contentLoader.js';
import CrudButtonGroup from '../components/CrudButtonGroup.jsx';
import { getUsers } from '../lib/data/users.js';

const sections = getSectionList();

const featured = contentIndex
  .filter((item) => item.slug && item.description)
  .slice(0, 6);

const Home = () => {
  const [lastAction, setLastAction] = useState('');
  const users = useMemo(() => getUsers(), []);

  const sectionLinks = useMemo(() => {
    const hasUsers = sections.some((section) => section.key === 'usuarios');
    if (hasUsers) {
      return sections;
    }

    return [
      ...sections,
      {
        key: 'usuarios',
        title: 'Usuarios',
        slug: 'usuarios',
        items: [],
      },
    ];
  }, []);

  const managementSections = useMemo(() => {
    const contentSections = sections.map((section) => ({
      key: section.key,
      title: section.title,
      slug: section.slug,
      description: `Gestiona el contenido publicado en ${section.title}.`,
      resourcesLabel:
        section.items.length === 1
          ? '1 recurso'
          : `${section.items.length} recursos`,
      readHref: `/${section.slug}`,
    }));

    return [
      ...contentSections,
      {
        key: 'usuarios',
        title: 'Usuarios',
        slug: 'usuarios',
        description: 'Administra los perfiles y permisos del equipo.',
        resourcesLabel:
          users.length === 1 ? '1 usuario' : `${users.length} usuarios`,
        readHref: '/usuarios',
      },
    ];
  }, [users.length]);

  const handleAction = useCallback((sectionTitle, actionLabel) => {
    setLastAction(`${actionLabel} · ${sectionTitle}`);
  }, []);

  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/10 via-transparent to-primary/20 p-8 dark:border-slate-800 dark:from-primary/20 dark:to-slate-900">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Bienvenidos a NUCLEO</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          El repositorio interno de TROPICA para documentar recursos de inteligencia artificial, automatizaciones, RR.HH. e inducciones.
          Encuentra guías, licencias y procesos en un solo lugar.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {sectionLinks.map((section) => (
            <Link
              key={section.key}
              to={`/${section.slug}`}
              className="rounded-full border border-primary/40 bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm transition hover:border-primary hover:bg-primary/10 dark:bg-slate-950"
            >
              {section.title}
            </Link>
          ))}
        </div>
      </section>

      {lastAction ? (
        <div
          className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary dark:border-primary/30 dark:bg-primary/10"
          role="status"
          aria-live="polite"
        >
          {lastAction}
        </div>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Recursos destacados</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {featured.map((item) => (
            <Link
              key={item.id}
              to={`/${item.slug}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="text-xs uppercase tracking-wide text-primary">{item.section}</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Gestión rápida por sección</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Utiliza los accesos directos para crear, consultar, actualizar o eliminar contenido de cada sección, incluyendo la administración de usuarios.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {managementSections.map((section) => (
            <article
              key={section.key}
              className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{section.title}</h3>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {section.resourcesLabel}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{section.description}</p>
              </div>
              <CrudButtonGroup
                onCreate={() => handleAction(section.title, 'Crear')}
                onRead={() => handleAction(section.title, 'Consultar')}
                onUpdate={() => handleAction(section.title, 'Actualizar')}
                onDelete={() => handleAction(section.title, 'Eliminar')}
                readHref={section.readHref}
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
