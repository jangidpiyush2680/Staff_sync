import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ roles }) {
  const { user, bootstrapping } = useSelector((state) => state.auth);
  const location = useLocation();
  if (bootstrapping) return <div className="app-loading"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading</span></div><p>Loading StaffSync…</p></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
