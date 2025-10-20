import React from 'react';
import AppRouter from './router.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

const App = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);

export default App;
