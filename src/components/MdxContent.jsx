import React from 'react';
import { MDXProvider } from '@mdx-js/react';
import Tag from './Tag.jsx';
import CreatePublication from './CreatePublication.jsx';

const components = {
  a: (props) => <a {...props} className="font-medium text-primary hover:text-primary-dark" />,
  Tag,
  CreatePublication
};

const MdxContent = ({ children }) => (
  <div className="prose prose-slate dark:prose-invert">
    <MDXProvider components={components}>{children}</MDXProvider>
  </div>
);

export default MdxContent;
