import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FavoritesProvider } from '@/components/drinks/FavoritesProvider';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { Layout } from '@/components/layout/Layout';
import { PrivateRoute, PublicOnlyRoute } from '@/components/layout/PrivateRoute';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { isDemoMode } from '@/lib/supabase';
import AuthCallback from '@/pages/AuthCallback';
import CreateDrink from '@/pages/CreateDrink';
import DrinkDetails from '@/pages/DrinkDetails';
import Drinks from '@/pages/Drinks';
import EditDrink from '@/pages/EditDrink';
import Favorites from '@/pages/Favorites';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Profile from '@/pages/Profile';
import Register from '@/pages/Register';
import ResetPassword from '@/pages/ResetPassword';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

/**
 * Em produção (Supabase configurado) usamos BrowserRouter para que o
 * redirect do OAuth (/auth/callback) funcione. No modo demonstração,
 * HashRouter permite servir o build estático em qualquer caminho.
 */
function Router({ children }: { children: ReactNode }) {
  return isDemoMode ? <HashRouter>{children}</HashRouter> : <BrowserRouter>{children}</BrowserRouter>;
}

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <FavoritesProvider>
            <ScrollToTop />
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="drinks" element={<Drinks />} />
                <Route path="drinks/:id" element={<DrinkDetails />} />
                <Route
                  path="drinks/:id/editar"
                  element={
                    <PrivateRoute>
                      <EditDrink />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="criar-drink"
                  element={
                    <PrivateRoute>
                      <CreateDrink />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="favoritos"
                  element={
                    <PrivateRoute>
                      <Favorites />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="perfil"
                  element={
                    <PrivateRoute>
                      <Profile />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="login"
                  element={
                    <PublicOnlyRoute>
                      <Login />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="cadastro"
                  element={
                    <PublicOnlyRoute>
                      <Register />
                    </PublicOnlyRoute>
                  }
                />
                <Route path="auth/callback" element={<AuthCallback />} />
                <Route path="redefinir-senha" element={<ResetPassword />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </FavoritesProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}
