import React from 'react';
import { Link } from 'react-router-dom';

const Tag = ({ value }) => (
  <Link
    to={`/tags/${encodeURIComponent(value)}`}
    className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
  >
    #{value}
  </Link>
);

export default Tag;
