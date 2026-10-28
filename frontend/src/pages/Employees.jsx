import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api, { getErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import Feedback from '../components/Feedback';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const blankForm = { name: '', email: '', password: '', employeeId: '', role: 'EMPLOYEE', department: 'Engineering', designation: 'Employee', phone: '', address: '', joiningDate: new Date().toISOString().slice(0, 10), manager: '' };

export default function Employees() {
  const { user } = useSelector((state) => state.auth);
  const isHR = user?.role === 'HR';
  const [items, setItems] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 10, search, department: department || undefined, status: statusFilter || undefined };
      const { data } = await api.get('/employees', { params });
      setItems(data.items || []); setTotal(data.total || 0); setPages(data.pages || 1); setDepartmentOptions(data.departments || []);
    } catch (err) { setError(getErrorMessage(err, 'Unable to load employee records.')); }
    finally { setLoading(false); }
  }, [page, search, department, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isHR) api.get('/employees', { params: { role: 'MANAGER', limit: 100 } }).then(({ data }) => setManagers(data.items || [])).catch(() => {});
  }, [isHR]);

  function openCreate() { setEditing(null); setForm({ ...blankForm, employeeId: `SS-${String(Date.now()).slice(-5)}` }); setError(''); setModalOpen(true); }
  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.user?.name || '', email: item.user?.email || '', password: '', employeeId: item.employeeId || '', role: item.user?.role || 'EMPLOYEE', department: item.department || '', designation: item.designation || '', phone: item.phone || '', address: item.address || '', joiningDate: item.joiningDate || '', manager: item.manager?._id || item.manager || '' });
    setError(''); setModalOpen(true);
  }
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess(''); setSaving(true);
    const payload = { ...form, manager: form.role === 'MANAGER' ? '' : form.manager };
    if (!payload.password && editing) delete payload.password;
    try {
      if (editing) await api.put(`/employees/${editing._id}`, payload);
      else await api.post('/employees', payload);
      setSuccess(editing ? 'Employee record updated.' : 'Account created successfully.');
      setModalOpen(false); await load();
      const { data } = await api.get('/employees', { params: { role: 'MANAGER', limit: 100 } }); setManagers(data.items || []);
    } catch (err) { setError(getErrorMessage(err, 'Unable to save this record.')); }
    finally { setSaving(false); }
  }

  async function toggleStatus(item) {
    const active = item.user?.isActive !== false;
    const next = !active;
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} ${item.user?.name || 'this account'}?`)) return;
    setError(''); setSuccess('');
    try { const { data } = await api.patch(`/employees/${item._id}/status`, { isActive: next }); setSuccess(data.message); await load(); }
    catch (err) { setError(getErrorMessage(err)); }
  }

  return <>
    <PageHeader eyebrow={isHR ? 'PEOPLE OPERATIONS' : 'TEAM WORKSPACE'} title={isHR ? 'Employee directory' : 'My team'} description={isHR ? 'Manage employee records, role assignments, and account status from one place.' : 'View the employees assigned to your team and their current work details.'} action={isHR && <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg me-2" />Add employee</button>} />
    <div className="feedback-stack"><Feedback>{error}</Feedback><Feedback type="success">{success}</Feedback></div>
    <div className="card-panel">
      <div className="panel-heading"><div><h2>{isHR ? 'All employee records' : 'Team members'}</h2><p>{total} record{total === 1 ? '' : 's'} available in your view</p></div><span className="status-badge status-primary">{isHR ? 'HR ACCESS' : 'TEAM ACCESS'}</span></div>
      <div className="panel-body"><form className="filter-row" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}><div className="filter-control" style={{ flex: 2 }}><label>Search records</label><input className="form-control" placeholder="Name, ID, department or designation" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></div><div className="filter-control"><label>Department</label><select className="form-select" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}><option value="">All departments</option>{departmentOptions.map((name) => <option key={name}>{name}</option>)}</select></div><div className="filter-control" style={{ maxWidth: 145 }}><label>Account status</label><select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div><button className="btn btn-outline-secondary" type="submit"><i className="bi bi-search me-1" />Search</button><button className="btn btn-light" type="button" onClick={() => { setSearchInput(''); setSearch(''); setDepartment(''); setStatusFilter(''); setPage(1); }}><i className="bi bi-arrow-counterclockwise" /></button></form></div>
      {loading ? <Loading /> : items.length === 0 ? <EmptyState icon="bi-people" title="No matching employees" text="Try changing your search or add a record to begin." /> : <div className="content-table-wrap"><table className="table"><thead><tr><th>Employee</th><th>Employee ID</th><th>Department</th><th>Designation</th><th>Manager</th><th>Role</th><th>Status</th>{isHR && <th>Actions</th>}</tr></thead><tbody>{items.map((item) => <tr key={item._id}><td><div className="person-cell"><div className="person-avatar">{item.user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</div><div><div className="person-name">{item.user?.name || 'Unknown user'}</div><div className="person-detail">{item.user?.email || ''}</div></div></div></td><td><span className="fw-semibold small">{item.employeeId}</span></td><td>{item.department || '—'}</td><td>{item.designation || '—'}</td><td>{item.manager?.name || (item.user?.role === 'MANAGER' ? 'Team manager' : 'Unassigned')}</td><td><span className="status-badge status-primary">{item.user?.role || 'EMPLOYEE'}</span></td><td><StatusBadge status={item.user?.isActive === false || item.employmentStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'} /></td>{isHR && <td><div className="d-flex gap-1"><button className="btn-action-icon" title="View details" onClick={() => setViewing(item)}><i className="bi bi-eye" /></button><button className="btn-action-icon" title="Edit record" onClick={() => openEdit(item)}><i className="bi bi-pencil" /></button><button className="btn-action-icon" title={item.user?.isActive === false ? 'Activate account' : 'Deactivate account'} onClick={() => toggleStatus(item)}><i className={`bi ${item.user?.isActive === false ? 'bi-person-check' : 'bi-person-slash'}`} /></button></div></td>}</tr>)}</tbody></table></div>}
      <div className="pagination-row"><span>Showing {items.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, total)} of {total}</span><div className="pagination-actions"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
    </div>
    {viewing && <Modal title="Employee details" subtitle="Profile and employment details visible to your role." onClose={() => setViewing(null)}><div className="detail-person-heading"><div className="profile-large-avatar detail-avatar">{viewing.user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</div><div><h3>{viewing.user?.name || 'Unknown user'}</h3><p>{viewing.user?.email || ''}</p><span className="status-badge status-primary">{viewing.user?.role || 'EMPLOYEE'}</span></div></div><div className="account-info-grid mt-4"><div><span>Employee ID</span><strong>{viewing.employeeId || '—'}</strong></div><div><span>Account status</span><strong>{viewing.user?.isActive === false ? 'Inactive' : 'Active'}</strong></div><div><span>Department</span><strong>{viewing.department || '—'}</strong></div><div><span>Designation</span><strong>{viewing.designation || '—'}</strong></div><div><span>Joining date</span><strong>{viewing.joiningDate || '—'}</strong></div><div><span>Manager</span><strong>{viewing.manager?.name || (viewing.user?.role === 'MANAGER' ? 'Team manager' : 'Unassigned')}</strong></div><div><span>Phone</span><strong>{viewing.phone || '—'}</strong></div><div><span>Address</span><strong>{viewing.address || '—'}</strong></div></div><div className="form-actions"><button className="btn btn-light" onClick={() => setViewing(null)}>Close</button><button className="btn btn-primary" onClick={() => { setViewing(null); openEdit(viewing); }}>Edit record</button></div></Modal>}
    {modalOpen && <Modal title={editing ? 'Edit employee record' : 'Create account'} subtitle={editing ? 'Update permitted employment information.' : 'Create an Employee or Manager account from the HR workspace.'} onClose={() => setModalOpen(false)} size="large">
      <Feedback>{error}</Feedback><form onSubmit={submit}><div className="row g-3"><div className="col-md-6"><label className="form-label">Full name *</label><input className="form-control" required minLength={2} value={form.name} onChange={(e) => update('name', e.target.value)} /></div><div className="col-md-6"><label className="form-label">Work email *</label><input className="form-control" required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>{!editing && <div className="col-md-6"><label className="form-label">Temporary password *</label><input className="form-control" required minLength={8} type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" /></div>}<div className="col-md-6"><label className="form-label">Employee ID *</label><input className="form-control" required value={form.employeeId} onChange={(e) => update('employeeId', e.target.value.toUpperCase())} /></div><div className="col-md-6"><label className="form-label">Account role</label><select className="form-select" value={form.role} onChange={(e) => update('role', e.target.value)}><option value="EMPLOYEE">Employee</option><option value="MANAGER">Manager</option></select></div><div className="col-md-6"><label className="form-label">Department</label><input className="form-control" value={form.department} onChange={(e) => update('department', e.target.value)} required /></div><div className="col-md-6"><label className="form-label">Designation</label><input className="form-control" value={form.designation} onChange={(e) => update('designation', e.target.value)} required /></div><div className="col-md-6"><label className="form-label">Joining date</label><input className="form-control" type="date" value={form.joiningDate} onChange={(e) => update('joiningDate', e.target.value)} /></div><div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={(e) => update('phone', e.target.value)} maxLength={30} /></div>{form.role === 'EMPLOYEE' && <div className="col-md-6"><label className="form-label">Assign manager</label><select className="form-select" value={form.manager} onChange={(e) => update('manager', e.target.value)}><option value="">No manager assigned</option>{managers.map((manager) => <option key={manager.user?._id} value={manager.user?._id}>{manager.user?.name} · {manager.employeeId}</option>)}</select></div>}<div className="col-12"><label className="form-label">Address (optional)</label><input className="form-control" value={form.address} onChange={(e) => update('address', e.target.value)} maxLength={250} /></div></div><div className="form-actions"><button type="button" className="btn btn-light" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create account'}</button></div></form>
    </Modal>}
  </>;
}
