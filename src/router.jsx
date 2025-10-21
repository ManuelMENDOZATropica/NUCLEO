import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Tags from './pages/Tags.jsx';
import Content from './pages/Content.jsx';
import Users from './pages/Users.jsx';

const AppRouter = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="buscar" element={<Search />} />
      <Route path="tags/:tag" element={<Tags />} />
      <Route path="usuarios" element={<Users />} />
      <Route path="*" element={<Content />} />
    </Route>
  </Routes>
);

export default AppRouter;
