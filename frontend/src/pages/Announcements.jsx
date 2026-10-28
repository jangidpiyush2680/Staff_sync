import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api, { getErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import Feedback from '../components/Feedback';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

const blank = { title: '', message: '', category: 'General', publishedAt: '' };
const categories = ['General', 'HR', 'Policy', 'Event', 'Holiday'];
const categoryIcons = { General: 'bi-megaphone', HR: 'bi-people', Policy: 'bi-file-earmark-text', Event: 'bi-calendar-event', Holiday: 'bi-sun' };

export default function Announcements() {
  const { user } = useSelector((state) => state.auth);
  const isHR = user?.role === 'HR';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get('/announcements'); setItems(data.items || []); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load announcements.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ ...blank, publishedAt: new Date().toISOString().slice(0, 16) }); setError(''); setModalOpen(true); }
  function openEdit(item) { setEditing(item); setForm({ title: item.title, message: item.message, category: item.category, publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 16) : '' }); setError(''); setModalOpen(true); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    const payload = { ...form, publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined };
    try {
      const { data } = editing ? await api.put(`/announcements/${editing._id}`, payload) : await api.post('/announcements', payload);
      setSuccess(data.message || 'Announcement saved.'); setModalOpen(false); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to save announcement.')); }
    finally { setSaving(false); }
  }
  async function remove(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setError(''); setSuccess('');
    try { const { data } = await api.delete(`/announcements/${item._id}`); setSuccess(data.message); await load(); }
    catch (err) { setError(getErrorMessage(err, 'Unable to delete announcement.')); }
  }
  const visible = categoryFilter ? items.filter((item) => item.category === categoryFilter) : items;

  return <>
    <PageHeader eyebrow="COMPANY COMMUNICATION" title="Announcements" description="Stay up to date with shared news, policies, events, and workplace updates." action={isHR && <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg me-2" />Publish announcement</button>} />
    <div className="feedback-stack"><Feedback>{error}</Feedback><Feedback type="success">{success}</Feedback></div>
    <div className="card-panel"><div className="panel-heading"><div><h2>Latest updates</h2><p>{items.length} published announcement{items.length === 1 ? '' : 's'}</p></div><div className="filter-control" style={{ maxWidth: 160 }}><select className="form-select form-select-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter announcement category"><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div></div>
      {loading ? <Loading /> : visible.length === 0 ? <EmptyState icon="bi-megaphone" title="No announcements to show" text="Published announcements will appear here when they are available." /> : <div className="announcement-grid">{visible.map((item) => <article className="announcement-card" key={item._id}><div className="announcement-card-top"><div className="announcement-icon"><i className={`bi ${categoryIcons[item.category] || 'bi-megaphone'}`} /></div><span className="announcement-category">{item.category}</span>{isHR && <div className="announcement-actions"><button className="btn-action-icon" onClick={() => openEdit(item)} title="Edit"><i className="bi bi-pencil" /></button><button className="btn-action-icon" onClick={() => remove(item)} title="Delete"><i className="bi bi-trash3" /></button></div>}</div><h3>{item.title}</h3><p className="announcement-message">{item.message}</p><div className="announcement-footer"><span><i className="bi bi-calendar3 me-1" />{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently published'}</span><span>By {item.createdBy?.name || 'HR team'}</span></div></article>)}</div>}
    </div>
    {modalOpen && <Modal title={editing ? 'Edit announcement' : 'Publish announcement'} subtitle="This update will be visible to authenticated StaffSync users after its publication date." onClose={() => setModalOpen(false)}><Feedback>{error}</Feedback><form onSubmit={submit}><div className="mb-3"><label className="form-label">Title *</label><input className="form-control" minLength={3} maxLength={140} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Upcoming company town hall" /></div><div className="mb-3"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="mb-3"><label className="form-label">Message *</label><textarea className="form-control" rows="5" minLength={5} maxLength={5000} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write the details employees need to know…" /></div><div className="mb-2"><label className="form-label">Publish date and time</label><input type="datetime-local" className="form-control" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} /></div><div className="form-actions"><button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Publish update'}</button></div></form></Modal>}
  </>;
}
