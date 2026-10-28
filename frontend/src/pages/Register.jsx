import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth } from '../features/auth/authSlice';
import api, { getErrorMessage } from '../services/api';
import Feedback from '../components/Feedback';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError('');
    if (form.password.length < 8) return setError('Password must contain at least 8 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
      dispatch(setAuth(data)); navigate('/dashboard', { replace: true });
    } catch (err) { setError(getErrorMessage(err, 'Unable to create your account.')); }
    finally { setLoading(false); }
  }
  return <div className="auth-screen register-screen"><div className="auth-showcase"><div className="auth-brand"><div className="brand-mark"><i className="bi bi-people-fill" /></div><div><div className="brand-name">StaffSync</div><div className="brand-subtitle">PEOPLE OPERATIONS</div></div></div><div className="showcase-content"><span className="showcase-kicker">START WITH THE BASICS</span><h1>Your workday,<br /><span>made simpler.</span></h1><p>Create an employee account to manage your profile, record attendance, request leave, and explore training.</p><div className="showcase-features"><div><i className="bi bi-check2-circle" /><span>Personal HR dashboard</span></div><div><i className="bi bi-check2-circle" /><span>Attendance and leave history</span></div><div><i className="bi bi-check2-circle" /><span>Team updates and learning</span></div></div></div><div className="showcase-footer"><span>StaffSync · Modern Human Resource Management Solution</span></div></div>
    <div className="auth-panel-wrap"><div className="auth-panel register-panel"><div className="auth-panel-top"><span className="eyebrow">EMPLOYEE ONBOARDING</span><span className="secure-pill"><i className="bi bi-person-check" /> Employee account</span></div><h2>Create your account</h2><p className="auth-intro">Register with your name and work email to get started.</p><Feedback>{error}</Feedback>
      <form onSubmit={submit} className="auth-form"><label className="form-label" htmlFor="name">Full name</label><div className="input-with-icon"><i className="bi bi-person" /><input id="name" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} maxLength={100} required placeholder="Your full name" /></div>
        <label className="form-label" htmlFor="email">Work email</label><div className="input-with-icon"><i className="bi bi-envelope" /><input id="email" type="email" autoComplete="username" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@company.com" /></div>
        <label className="form-label" htmlFor="password">Create password</label><div className="input-with-icon"><i className="bi bi-lock" /><input id="password" type="password" autoComplete="new-password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required placeholder="At least 8 characters" /></div>
        <label className="form-label" htmlFor="confirmPassword">Confirm password</label><div className="input-with-icon"><i className="bi bi-shield-lock" /><input id="confirmPassword" type="password" autoComplete="new-password" className="form-control" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} minLength={8} required placeholder="Repeat your password" /></div>
        <button className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Creating account…' : <>Create employee account <i className="bi bi-arrow-right ms-2" /></>}</button>
      </form><div className="register-note"><i className="bi bi-info-circle" /> Public registration creates an Employee account only. HR and Manager access is managed by HR.</div><div className="auth-signup">Already registered? <Link to="/login">Sign in instead</Link></div></div></div></div>;
}
