import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchContent } from '../lib/searchIndex.js';
import Tag from '../components/Tag.jsx';

const Search = () => {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function run() {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const hits = await searchContent(query);
        if (!isCancelled) {
          setResults(hits);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      isCancelled = true;
    };
  }, [query]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-primary">Resultados de búsqueda</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {query ? `“${query}”` : 'Escribe en la barra para buscar'}
        </h1>
      </header>

      {loading && <p className="text-sm text-slate-500">Buscando…</p>}

      {!loading && query && results.length === 0 && (
        <p className="text-sm text-slate-500">No se encontraron resultados.</p>
      )}

      <ul className="space-y-4">
        {results.map((item) => (
          <li key={item.slug} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <Link to={`/${item.slug}`} className="text-lg font-semibold text-primary">
              {item.title}
            </Link>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags?.map((tag) => (
                <Tag key={tag} value={tag} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Search;
