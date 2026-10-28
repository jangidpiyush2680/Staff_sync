import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api, { getErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import Feedback from '../components/Feedback';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((part) => [part.type, part.value]));
const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
const blankLeave = { leaveType: 'Casual Leave', startDate: today, endDate: today, reason: '' };

function dayCount(start, end) {
  if (!start || !end) return '—';
  return Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86400000) + 1;
}

export default function Leaves() {
  const { user } = useSelector((state) => state.auth);
  const isEmployee = user?.role === 'EMPLOYEE';
  const canReview = ['HR', 'MANAGER'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankLeave);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decision, setDecision] = useState({ status: 'APPROVED', decisionComment: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/leaves', { params: { limit: 100, status: statusFilter || undefined } });
      setItems(data.items || []);
    } catch (err) { setError(getErrorMessage(err, 'Unable to load leave requests.')); }
    finally { setLoading(false); }
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  async function submitLeave(event) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const { data } = await api.post('/leaves', form);
      setSuccess(data.message || 'Leave request submitted.'); setForm(blankLeave); setShowForm(false); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to submit your request.')); }
    finally { setBusy(false); }
  }

  function openDecision(item, status) { setDecisionTarget(item); setDecision({ status, decisionComment: '' }); }
  async function submitDecision(event) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const { data } = await api.patch(`/leaves/${decisionTarget._id}/decision`, decision);
      setSuccess(data.message || 'Leave decision saved.'); setDecisionTarget(null); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to save this leave decision.')); }
    finally { setBusy(false); }
  }

  const pendingCount = items.filter((item) => item.status === 'PENDING').length;
  return <>
    <PageHeader eyebrow="TIME OFF & APPROVALS" title="Leave management" description={isEmployee ? 'Submit a leave request and track review progress in one place.' : user?.role === 'HR' ? 'Review organization-wide leave requests and keep decisions transparent.' : 'Review requests from the employees assigned to your team.'} action={isEmployee ? <button className="btn btn-primary" onClick={() => { setError(''); setShowForm((value) => !value); }}><i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'} me-2`} />{showForm ? 'Close form' : 'Request leave'}</button> : null} />
    <div className="feedback-stack"><Feedback>{error}</Feedback><Feedback type="success">{success}</Feedback></div>
    {isEmployee && showForm && <div className="form-section mb-4"><h2>New leave request</h2><p>Enter the dates and reason. Your request will remain pending until an authorized reviewer decides.</p><form onSubmit={submitLeave}><div className="row g-3"><div className="col-md-4"><label className="form-label">Leave type *</label><select className="form-select" required value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}><option>Casual Leave</option><option>Sick Leave</option><option>Earned Leave</option></select></div><div className="col-md-4"><label className="form-label">Start date *</label><input type="date" className="form-control" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div><div className="col-md-4"><label className="form-label">End date *</label><input type="date" className="form-control" required min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div><div className="col-12"><label className="form-label">Reason *</label><textarea className="form-control" rows="3" minLength={5} maxLength={1000} required placeholder="Briefly explain your request" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div></div><div className="form-actions"><button type="button" className="btn btn-light" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button></div></form></div>}
    <div className="card-panel"><div className="panel-heading"><div><h2>{isEmployee ? 'My leave requests' : 'Leave request queue'}</h2><p>{canReview ? `${pendingCount} pending request${pendingCount === 1 ? '' : 's'} in this view` : 'Your submitted requests and reviewer decisions'}</p></div><div className="filter-control" style={{ maxWidth: 160 }}><select className="form-select form-select-sm" aria-label="Filter requests by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></div></div>
      {loading ? <Loading /> : items.length === 0 ? <EmptyState icon="bi-calendar2-check" title="No leave requests found" text={isEmployee ? 'Your requests will appear here after you submit the first one.' : 'There are no requests matching the selected status.'} /> : <div className="content-table-wrap"><table className="table"><thead><tr>{!isEmployee && <th>Employee</th>}<th>Leave type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Review details</th>{canReview && <th>Action</th>}</tr></thead><tbody>{items.map((item) => <tr key={item._id}>{!isEmployee && <td><div className="person-cell"><div className="person-avatar">{item.employee?.user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</div><div><div className="person-name">{item.employee?.user?.name || 'Employee'}</div><div className="person-detail">{item.employee?.employeeId || ''}</div></div></div></td>}<td><span className="fw-semibold small">{item.leaveType}</span></td><td><div className="small fw-semibold">{item.startDate}</div><div className="text-muted-small">to {item.endDate}</div></td><td>{dayCount(item.startDate, item.endDate)}</td><td><div className="leave-reason">{item.reason}</div></td><td><StatusBadge status={item.status} /></td><td>{item.reviewer ? <><div className="person-name">{item.reviewer.name}</div><div className="person-detail">{item.decisionDate ? new Date(item.decisionDate).toLocaleDateString() : ''}</div>{item.decisionComment && <div className="person-detail mt-1">“{item.decisionComment}”</div>}</> : <span className="text-muted-small">Awaiting review</span>}</td>{canReview && <td>{item.status === 'PENDING' ? <div className="d-flex gap-1"><button className="btn btn-sm btn-outline-success" onClick={() => openDecision(item, 'APPROVED')} title="Approve"><i className="bi bi-check2 me-1" />Approve</button><button className="btn btn-sm btn-outline-danger" onClick={() => openDecision(item, 'REJECTED')} title="Reject"><i className="bi bi-x me-1" />Reject</button></div> : <span className="text-muted-small">Processed</span>}</td>}</tr>)}</tbody></table></div>}
    </div>
    {decisionTarget && <Modal title={`${decision.status === 'APPROVED' ? 'Approve' : 'Reject'} leave request`} subtitle={`${decisionTarget.employee?.user?.name || 'Employee'} · ${decisionTarget.leaveType} · ${decisionTarget.startDate} to ${decisionTarget.endDate}`} onClose={() => setDecisionTarget(null)}><form onSubmit={submitDecision}><div className="alert alert-light border small">This action is saved to the database and will be visible to the employee. The decision cannot be repeated after the request is processed.</div><label className="form-label">Decision comment (optional)</label><textarea className="form-control" rows="3" maxLength={1000} value={decision.decisionComment} onChange={(e) => setDecision({ ...decision, decisionComment: e.target.value })} placeholder="Add context for the employee" /><div className="form-actions"><button type="button" className="btn btn-light" onClick={() => setDecisionTarget(null)}>Cancel</button><button className={`btn ${decision.status === 'APPROVED' ? 'btn-primary' : 'btn-danger'}`} disabled={busy}>{busy ? 'Saving…' : `Confirm ${decision.status.toLowerCase()}`}</button></div></form></Modal>}
  </>;
}
