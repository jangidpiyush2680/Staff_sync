import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { clearAuth } from '../features/auth/authSlice';
import api from '../services/api';

const commonLinks = [
  { to: '/dashboard', icon: 'bi-grid-1x2', label: 'Overview' },
  { to: '/attendance', icon: 'bi-clock-history', label: 'Attendance' },
  { to: '/leaves', icon: 'bi-calendar2-check', label: 'Leave management' },
  { to: '/announcements', icon: 'bi-megaphone', label: 'Announcements' },
  { to: '/training', icon: 'bi-mortarboard', label: 'Training' },
];

export default function AppLayout() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    api.get('/notifications').then(({ data }) => setUnread(data.unreadCount || 0)).catch(() => {});
  }, [location.pathname]);

  const links = [...commonLinks];
  if (user?.role === 'HR') links.splice(1, 0, { to: '/employees', icon: 'bi-people', label: 'Employee directory' }, { to: '/reports', icon: 'bi-graph-up-arrow', label: 'Reports & analytics' });
  if (user?.role === 'MANAGER') links.splice(1, 0, { to: '/employees', icon: 'bi-people', label: 'My team' });
  links.push({ to: '/profile', icon: 'bi-person-badge', label: 'My profile' });
  links.push({ to: '/notifications', icon: 'bi-bell', label: 'Notifications', count: unread });

  function logout() { dispatch(clearAuth()); navigate('/login', { replace: true }); }

  return <div className="app-shell">
    {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`app-sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-lockup"><div className="brand-mark"><i className="bi bi-people-fill" /></div><div><div className="brand-name">StaffSync</div><div className="brand-subtitle">PEOPLE OPERATIONS</div></div></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <i className={`bi ${link.icon}`} /><span>{link.label}</span>{link.count > 0 && <span className="nav-count">{link.count > 9 ? '9+' : link.count}</span>}
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><i className="bi bi-shield-check" /></div><strong>People first.</strong><span>One workspace for your team's everyday HR needs.</span></div>
        <div className="sidebar-user"><div className="avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</div><div className="user-copy"><strong>{user?.name}</strong><span>{user?.role === 'HR' ? 'HR Administrator' : user?.role === 'MANAGER' ? 'Manager' : 'Employee'}</span></div><button className="icon-button logout-button" title="Sign out" onClick={logout}><i className="bi bi-box-arrow-right" /></button></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar"><button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><i className="bi bi-list" /></button><div className="topbar-context"><span className="topbar-dot" /> Your people workspace</div><div className="topbar-right"><span className="topbar-date">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date())}</span><button className="topbar-avatar" onClick={() => navigate('/profile')} title="Open profile">{user?.name?.slice(0, 1)?.toUpperCase()}</button></div></header>
      <main className="page-container"><Outlet /></main>
      <footer className="app-footer"><span>StaffSync <span className="footer-dot">·</span> Modern Human Resource Management Solution</span><span>Built for clear, connected workdays</span></footer>
    </div>
  </div>;
}
