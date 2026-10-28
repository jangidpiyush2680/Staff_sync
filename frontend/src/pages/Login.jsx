import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth } from '../features/auth/authSlice';
import api, { getErrorMessage } from '../services/api';
import Feedback from '../components/Feedback';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      dispatch(setAuth(data));
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) { setError(getErrorMessage(err, 'Unable to sign in.')); }
    finally { setLoading(false); }
  }

  function fillDemo(email) { setForm({ email, password: 'StaffSync@123' }); setError(''); }

  return <div className="auth-screen">
    <div className="auth-showcase">
      <div className="auth-brand"><div className="brand-mark"><i className="bi bi-people-fill" /></div><div><div className="brand-name">StaffSync</div><div className="brand-subtitle">PEOPLE OPERATIONS</div></div></div>
      <div className="showcase-content"><span className="showcase-kicker">A BETTER WAY TO WORK TOGETHER</span><h1>People, connected.<br /><span>Work, in sync.</span></h1><p>One thoughtful workspace for your team's everyday HR needs — from attendance and leave to growth and communication.</p>
        <div className="showcase-features"><div><i className="bi bi-check2-circle" /><span>Simple employee management</span></div><div><i className="bi bi-check2-circle" /><span>Clear leave and attendance workflows</span></div><div><i className="bi bi-check2-circle" /><span>Team learning and announcements</span></div></div>
      </div><div className="showcase-footer"><span>StaffSync · Modern Human Resource Management Solution</span><span className="showcase-orbit orbit-one" /><span className="showcase-orbit orbit-two" /></div>
    </div>
    <div className="auth-panel-wrap"><div className="auth-panel">
      <div className="auth-panel-top"><span className="eyebrow">WELCOME BACK</span><span className="secure-pill"><i className="bi bi-shield-lock" /> Secure sign in</span></div>
      <h2>Sign in to StaffSync</h2><p className="auth-intro">Use your work account to continue to your workspace.</p>
      {params.get('expired') && <Feedback type="warning">Your session expired. Please sign in again.</Feedback>}
      <Feedback>{error}</Feedback>
      <form onSubmit={submit} className="auth-form">
        <label className="form-label" htmlFor="email">Work email</label><div className="input-with-icon"><i className="bi bi-envelope" /><input id="email" className="form-control" type="email" autoComplete="username" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div className="label-row"><label className="form-label" htmlFor="password">Password</label><span className="quiet-label">Min. 8 characters</span></div><div className="input-with-icon"><i className="bi bi-lock" /><input id="password" className="form-control" type="password" autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
        <button className="btn btn-primary auth-submit" disabled={loading}>{loading ? <><span className="spinner-border spinner-border-sm me-2" />Signing in…</> : <>Sign in <i className="bi bi-arrow-right ms-2" /></>}</button>
      </form>
      <div className="demo-box"><div className="demo-heading"><i className="bi bi-stars" /><div><strong>Demo access</strong><span>For local college demonstration only</span></div></div><div className="demo-buttons"><button type="button" onClick={() => fillDemo('hr@staffsync.local')}>HR admin</button><button type="button" onClick={() => fillDemo('manager@staffsync.local')}>Manager</button><button type="button" onClick={() => fillDemo('aarav@staffsync.local')}>Employee</button></div><div className="demo-password">Password: <code>StaffSync@123</code> <span>·</span> Run the backend seed script first.</div></div>
      <div className="auth-signup">New to StaffSync? <Link to="/register">Create an employee account</Link></div>
      <p className="auth-legal">Demo application · Do not use the development credentials in a live environment.</p>
    </div></div>
  </div>;
}
