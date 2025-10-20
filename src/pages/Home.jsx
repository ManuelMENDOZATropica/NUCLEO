import React from 'react';
import { Link } from 'react-router-dom';
import { contentIndex, getSectionList } from '../lib/contentLoader.js';

const sections = getSectionList();

const featured = contentIndex
  .filter((item) => item.slug && item.description)
  .slice(0, 6);

const Home = () => (
  <div className="space-y-12">
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/10 via-transparent to-primary/20 p-8 dark:border-slate-800 dark:from-primary/20 dark:to-slate-900">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Bienvenidos a NUCLEO</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
        El repositorio interno de TROPICA para documentar recursos de inteligencia artificial, automatizaciones, RR.HH. e inducciones.
        Encuentra guías, licencias y procesos en un solo lugar.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {sections.map((section) => (
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
  </div>
);

export default Home;
