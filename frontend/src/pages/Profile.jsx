import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api, { getErrorMessage } from '../services/api';
import { setUser } from '../features/auth/authSlice';
import PageHeader from '../components/PageHeader';
import Feedback from '../components/Feedback';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';

export default function Profile() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const isHR = user?.role === 'HR';
  const [employee, setEmployee] = useState(null);
  const [form, setForm] = useState({ name: user?.name || '', phone: '', address: '' });
  const [loading, setLoading] = useState(!isHR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isHR) { setLoading(false); return; }
    api.get('/employees/profile/me').then(({ data }) => {
      setEmployee(data.employee);
      setForm({ name: data.employee.user?.name || user?.name || '', phone: data.employee.phone || '', address: data.employee.address || '' });
    }).catch((err) => setError(getErrorMessage(err, 'Unable to load your profile.'))).finally(() => setLoading(false));
  }, [isHR, user?.name]);

  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess(''); setSaving(true);
    try {
      const { data } = await api.put('/employees/profile/me', form);
      setEmployee(data.employee);
      if (data.employee.user) dispatch(setUser(data.employee.user));
      setSuccess('Your profile has been updated.');
    } catch (err) { setError(getErrorMessage(err, 'Unable to save your profile.')); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeader eyebrow="PERSONAL SETTINGS" title="My profile" description="View your account details and keep permitted contact information up to date." />
    <div className="feedback-stack"><Feedback>{error}</Feedback><Feedback type="success">{success}</Feedback></div>
    {loading ? <Loading label="Loading your profile…" /> : <div className="profile-layout"><section className="card-panel profile-summary"><div className="profile-cover"><div className="profile-large-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</div></div><div className="profile-summary-body"><h2>{user?.name}</h2><p>{user?.email}</p><span className="status-badge status-primary">{user?.role}</span><div className="profile-info-list"><div><span>Account status</span><StatusBadge status={user?.isActive === false ? 'INACTIVE' : 'ACTIVE'} /></div>{employee && <><div><span>Employee ID</span><strong>{employee.employeeId}</strong></div><div><span>Department</span><strong>{employee.department || '—'}</strong></div><div><span>Designation</span><strong>{employee.designation || '—'}</strong></div><div><span>Joining date</span><strong>{employee.joiningDate || '—'}</strong></div><div><span>Manager</span><strong>{employee.manager?.name || 'Not assigned'}</strong></div></>}</div></div></section>
      <section className="card-panel"><div className="panel-heading"><div><h2>Personal information</h2><p>{isHR ? 'Your HR administrator account details.' : 'You can edit your name and contact details. Employment fields are managed by HR.'}</p></div></div><div className="panel-body">{isHR ? <><div className="account-info-grid"><div><span>Full name</span><strong>{user?.name}</strong></div><div><span>Email address</span><strong>{user?.email}</strong></div><div><span>Access role</span><strong>HR Administrator</strong></div></div><div className="report-note mt-4"><i className="bi bi-info-circle me-1" />HR account details are managed through the controlled account setup process; public profile editing is not enabled for privileged accounts.</div></> : <form onSubmit={submit}><div className="mb-3"><label className="form-label">Full name</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} maxLength={100} required /></div><div className="mb-3"><label className="form-label">Email address</label><input className="form-control" value={user?.email || ''} disabled /><div className="form-text">Contact HR to change your account email.</div></div><div className="mb-3"><label className="form-label">Phone number</label><input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} placeholder="Your contact number" /></div><div className="mb-3"><label className="form-label">Address</label><textarea className="form-control" rows="3" maxLength={250} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Optional address information" /></div><div className="profile-security-note"><i className="bi bi-shield-check" /><span>Your role, employee ID, department, joining date, and manager assignment are protected and cannot be changed from this profile form.</span></div><div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div></form>}</div></section></div>}
  </>;
}
