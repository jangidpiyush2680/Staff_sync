import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuth, setUser } from './features/auth/authSlice';
import api from './services/api';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Announcements from './pages/Announcements';
import Training from './pages/Training';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';

export default function App() {
  const dispatch = useDispatch();
  const token = localStorage.getItem('staffsync_token');
  const { bootstrapping, user } = useSelector((state) => state.auth);
  useEffect(() => {
    if (!token) { dispatch(clearAuth()); return; }
    api.get('/auth/me').then(({ data }) => dispatch(setUser(data.user))).catch(() => dispatch(clearAuth()));
  }, [dispatch, token]);

  if (bootstrapping) return <div className="app-loading"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading</span></div><p>Getting your workspace ready…</p></div>;

  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
    <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route element={<ProtectedRoute roles={['HR', 'MANAGER']} />}><Route path="/employees" element={<Employees />} /></Route>
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/training" element={<Training />} />
        <Route element={<ProtectedRoute roles={['HR']} />}><Route path="/reports" element={<Reports />} /></Route>
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>;
}
