import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Tags from './pages/Tags.jsx';
import Content from './pages/Content.jsx';
import Users from './pages/Users.jsx';
import CreatePublication from './pages/CreatePublication.jsx';
import ManageUsers from './pages/ManageUsers.jsx';
import ManageCategories from './pages/ManageCategories.jsx';
import Categories from './pages/Categories.jsx';
import ManagePosts from './pages/ManagePosts.jsx';
import CategoryDetail from './pages/CategoryDetail.jsx';

const AppRouter = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="buscar" element={<Search />} />
      <Route path="publicaciones/nueva" element={<CreatePublication />} />
      <Route path="admin/usuarios" element={<ManageUsers />} />
      <Route path="admin/categorias" element={<ManageCategories />} />
      <Route path="categorias" element={<Categories />} />
      <Route path="categorias/gestionar" element={<ManagePosts />} />
      <Route path="categorias/:categoryId" element={<CategoryDetail />} />
      <Route path="tags/:tag" element={<Tags />} />
      <Route path="usuarios" element={<Users />} />
      <Route path="*" element={<Content />} />
    </Route>
  </Routes>
);

export default AppRouter;
