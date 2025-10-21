import React from 'react';
import { MDXProvider } from '@mdx-js/react';
import Tag from './Tag.jsx';
import CreatePublication from './CreatePublication.jsx';

const components = {
  a: (props) => <a {...props} className="font-medium text-primary hover:text-primary-dark" />,
  Tag,
  CreatePublication
};

const MdxContent = ({ children }) => {
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childComponents = child.props?.components ?? {};
      return React.cloneElement(child, {
        components: {
          ...childComponents,
          ...components
        }
      });
    }

    return child;
  });

  return (
    <div className="prose prose-slate dark:prose-invert">
      <MDXProvider components={components}>{enhancedChildren}</MDXProvider>
    </div>
  );
};

export default MdxContent;
