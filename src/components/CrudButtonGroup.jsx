import React from 'react';
import { Link } from 'react-router-dom';

const baseButtonStyles =
  'inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

const variantStyles = {
  create: `${baseButtonStyles} bg-primary text-white shadow-sm hover:bg-primary/90 focus-visible:outline-primary`,
  read: `${baseButtonStyles} border border-primary/70 text-primary hover:bg-primary/10 focus-visible:outline-primary`,
  update: `${baseButtonStyles} bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline-slate-500 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`,
  delete: `${baseButtonStyles} bg-red-50 text-red-600 hover:bg-red-100 focus-visible:outline-red-500 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40`,
};

const defaultLabels = {
  create: 'Crear',
  read: 'Ver',
  update: 'Editar',
  delete: 'Eliminar',
};

const CrudButtonGroup = ({
  onCreate,
  onRead,
  onUpdate,
  onDelete,
  readHref,
  labels = {},
}) => {
  const mergedLabels = { ...defaultLabels, ...labels };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCreate}
        className={variantStyles.create}
        aria-label={`${mergedLabels.create} elemento`}
      >
        {mergedLabels.create}
      </button>

      {readHref ? (
        <Link
          to={readHref}
          onClick={onRead}
          className={variantStyles.read}
          aria-label={`${mergedLabels.read} elemento`}
        >
          {mergedLabels.read}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRead}
          className={variantStyles.read}
          aria-label={`${mergedLabels.read} elemento`}
        >
          {mergedLabels.read}
        </button>
      )}

      <button
        type="button"
        onClick={onUpdate}
        className={variantStyles.update}
        aria-label={`${mergedLabels.update} elemento`}
      >
        {mergedLabels.update}
      </button>

      <button
        type="button"
        onClick={onDelete}
        className={variantStyles.delete}
        aria-label={`${mergedLabels.delete} elemento`}
      >
        {mergedLabels.delete}
      </button>
    </div>
  );
};

export default CrudButtonGroup;
