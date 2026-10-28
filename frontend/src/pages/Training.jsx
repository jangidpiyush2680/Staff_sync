import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api, { getErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import Feedback from '../components/Feedback';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const blank = { title: '', description: '', trainer: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', mode: 'Online', location: '', status: 'ACTIVE' };
function dateLabel(date) { return date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not specified'; }

export default function Training() {
  const { user } = useSelector((state) => state.auth);
  const canManage = ['HR', 'MANAGER'].includes(user?.role);
  const isEmployee = user?.role === 'EMPLOYEE';
  const [items, setItems] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const requests = [api.get('/trainings', { params: { status: statusFilter || undefined } })];
      if (isEmployee) requests.push(api.get('/employees/profile/me'));
      const results = await Promise.all(requests);
      setItems(results[0].data.items || []);
      if (isEmployee) setProfileId(results[1].data.employee?._id || null);
    } catch (err) { setError(getErrorMessage(err, 'Unable to load training programs.')); }
    finally { setLoading(false); }
  }, [statusFilter, isEmployee]);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ ...blank }); setError(''); setModalOpen(true); }
  function openEdit(item) { setEditing(item); setForm({ title: item.title, description: item.description, trainer: item.trainer || '', startDate: item.startDate, endDate: item.endDate || '', mode: item.mode, location: item.location || '', status: item.status }); setError(''); setModalOpen(true); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const { data } = editing ? await api.put(`/trainings/${editing._id}`, form) : await api.post('/trainings', form);
      setSuccess(data.message || 'Training program saved.'); setModalOpen(false); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to save this training program.')); }
    finally { setSaving(false); }
  }
  async function enroll(item) {
    setError(''); setSuccess('');
    try { const { data } = await api.post(`/trainings/${item._id}/enroll`); setSuccess(data.message); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to enroll.')); }
  }
  async function complete(item) {
    setError(''); setSuccess('');
    try { const { data } = await api.post(`/trainings/${item._id}/complete`); setSuccess(data.message); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to record completion.')); }
  }
  async function updateStatus(item, status) {
    setError(''); setSuccess('');
    try { const { data } = await api.put(`/trainings/${item._id}`, { status }); setSuccess(data.message); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to update status.')); }
  }

  return <>
    <PageHeader eyebrow="LEARNING & DEVELOPMENT" title="Training programs" description={isEmployee ? 'Explore eligible learning sessions and keep your enrollment status up to date.' : 'Create and manage learning programs for employees and assigned teams.'} action={canManage && <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg me-2" />Create program</button>} />
    <div className="feedback-stack"><Feedback>{error}</Feedback><Feedback type="success">{success}</Feedback></div>
    <div className="card-panel"><div className="panel-heading"><div><h2>Learning library</h2><p>Program details, delivery mode, schedule, and enrollment.</p></div><div className="filter-control" style={{ maxWidth: 160 }}><select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter training status"><option value="ACTIVE">Active programs</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="">All programs</option></select></div></div>
      {loading ? <Loading /> : items.length === 0 ? <EmptyState icon="bi-mortarboard" title="No training programs found" text="New programs will appear here when HR or a manager publishes them." /> : <div className="training-grid">{items.map((item) => { const enrollment = profileId ? item.enrollments?.find((entry) => String(entry.employee) === String(profileId)) : null; const canEdit = user?.role === 'HR' || String(item.createdBy?._id || item.createdBy) === String(user?._id); return <article className="training-card" key={item._id}><div className="training-card-top"><div className="training-icon"><i className="bi bi-mortarboard-fill" /></div><StatusBadge status={item.status} />{canManage && canEdit && <button className="btn-action-icon" title="Edit program" onClick={() => openEdit(item)}><i className="bi bi-pencil" /></button>}</div><h3>{item.title}</h3><p className="training-description">{item.description}</p><div className="training-meta"><div><i className="bi bi-calendar3" /><span><strong>{dateLabel(item.startDate)}</strong><small>{item.endDate ? `Ends ${dateLabel(item.endDate)}` : 'Start date'}</small></span></div><div><i className="bi bi-laptop" /><span><strong>{item.mode}</strong><small>{item.location || item.trainer || 'Flexible location'}</small></span></div></div><div className="training-card-footer"><span className="text-muted-small">By {item.trainer || item.createdBy?.name || 'Training team'}</span>{isEmployee ? enrollment ? <div className="d-flex align-items-center gap-2">{enrollment.status === 'COMPLETED' ? <StatusBadge status="COMPLETED" /> : <button className="btn btn-sm btn-outline-success" onClick={() => complete(item)}>Mark complete</button>}</div> : item.status === 'ACTIVE' ? <button className="btn btn-sm btn-primary" onClick={() => enroll(item)}>Enroll now <i className="bi bi-arrow-right ms-1" /></button> : <span className="text-muted-small">Enrollment closed</span> : canManage && item.status === 'ACTIVE' && canEdit ? <button className="btn btn-sm btn-outline-secondary" onClick={() => updateStatus(item, 'COMPLETED')}>Mark completed</button> : null}</div></article>; })}</div>}
    </div>
    {modalOpen && <Modal title={editing ? 'Edit training program' : 'Create training program'} subtitle={user?.role === 'MANAGER' ? 'This program will be available to your assigned team.' : 'An active program is visible to eligible StaffSync employees.'} onClose={() => setModalOpen(false)}><form onSubmit={submit}><div className="mb-3"><label className="form-label">Program title *</label><input className="form-control" required minLength={3} maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div className="mb-3"><label className="form-label">Description *</label><textarea className="form-control" rows="3" required minLength={5} maxLength={3000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div className="row g-3"><div className="col-md-6"><label className="form-label">Trainer</label><input className="form-control" value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} /></div><div className="col-md-6"><label className="form-label">Delivery mode</label><select className="form-select" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option>Online</option><option>In person</option><option>Hybrid</option></select></div><div className="col-md-6"><label className="form-label">Start date *</label><input className="form-control" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div><div className="col-md-6"><label className="form-label">End date</label><input className="form-control" type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div><div className="col-md-8"><label className="form-label">Location or meeting details</label><input className="form-control" maxLength={200} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>{editing && <div className="col-md-4"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>ACTIVE</option><option>COMPLETED</option><option>CANCELLED</option></select></div>}</div><div className="form-actions"><button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create program'}</button></div></form></Modal>}
  </>;
}
