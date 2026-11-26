import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { AIAssistant } from './pages/AIAssistant';
import { RepoDetail } from './pages/RepoDetail';
import { Findings } from './pages/Findings';
import { PRReview } from './pages/PRReview';
import { Settings } from './pages/Settings';

// If someone's already logged in, bounce them off /login and /register to the dashboard
// instead of showing the auth form again.
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectIfAuthed><Auth /></RedirectIfAuthed>} />
      <Route path="/register" element={<RedirectIfAuthed><Auth /></RedirectIfAuthed>} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="ai" element={<AIAssistant />} />
        <Route path="repos/:id" element={<RepoDetail />} />
        <Route path="repos/:id/findings" element={<Findings />} />
        <Route path="repos/:id/fixes" element={<PRReview />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
