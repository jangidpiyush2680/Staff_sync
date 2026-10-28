import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api, { getErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import Feedback from '../components/Feedback';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function timeLabel(value) {
  return value ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
}

export default function Attendance() {
  const { user } = useSelector((state) => state.auth);
  const isEmployee = user?.role === 'EMPLOYEE';
  const isHR = user?.role === 'HR';
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  const [items, setItems] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [correcting, setCorrecting] = useState(null);
  const [correction, setCorrection] = useState({ checkIn: '', checkOut: '', status: 'PRESENT', reason: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 15, date: dateFilter || undefined, employee: isHR ? employeeFilter || undefined : undefined };
      if (isEmployee) {
        const [historyResponse, todayResponse] = await Promise.all([
          api.get('/attendance', { params }),
          api.get('/attendance', { params: { date: today, limit: 5 } }),
        ]);
        setItems(historyResponse.data.items || []); setTotal(historyResponse.data.total || 0); setPages(historyResponse.data.pages || 1);
        setTodayRecord(todayResponse.data.items?.[0] || null);
      } else {
        const { data } = await api.get('/attendance', { params });
        setItems(data.items || []); setTotal(data.total || 0); setPages(data.pages || 1);
      }
    } catch (err) { setError(getErrorMessage(err, 'Unable to load attendance records.')); }
    finally { setLoading(false); }
  }, [page, dateFilter, employeeFilter, isHR, isEmployee, today]);
  useEffect(() => { load(); }, [load]);

  const currentTodayRecord = todayRecord || items.find((item) => item.attendanceDate === today) || null;
  const checkedInCount = items.filter((item) => item.attendanceDate === today && item.status === 'PRESENT').length;
  async function markAttendance(action) {
    setBusy(true); setError(''); setSuccess('');
    try {
      const { data } = action === 'in' ? await api.post('/attendance/check-in') : await api.patch('/attendance/check-out');
      setSuccess(data.message); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to update attendance.')); }
    finally { setBusy(false); }
  }
  function openCorrection(item) {
    setCorrecting(item);
    setCorrection({ checkIn: localDateTime(item.checkIn), checkOut: localDateTime(item.checkOut), status: item.status || 'PRESENT', reason: '' });
  }
  async function saveCorrection(event) {
    event.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try {
      const payload = { ...correction, checkIn: new Date(correction.checkIn).toISOString(), checkOut: correction.checkOut ? new Date(correction.checkOut).toISOString() : null };
      const { data } = await api.patch(`/attendance/${correcting._id}/correction`, payload);
      setSuccess(data.message); setCorrecting(null); await load();
    } catch (err) { setError(getErrorMessage(err, 'Unable to save correction.')); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow="TIME & PRESENCE" title="Attendance" description={isEmployee ? 'Record your workday and review your attendance history.' : isHR ? 'Review attendance across the organization and correct records when needed.' : 'Review check-in records for the employees assigned to your team.'} />
    <div className="feedback-stack"><Feedback>{error}</Feedback><Feedback type="success">{success}</Feedback></div>
    {isEmployee && <div className="today-check-card"><div className="d-flex align-items-center gap-3"><div className="check-icon"><i className="bi bi-clock" /></div><div><strong>Today's attendance <span className="ms-2">{today}</span></strong><span>{currentTodayRecord ? `Checked in at ${timeLabel(currentTodayRecord.checkIn)}${currentTodayRecord.checkOut ? ` · Checked out at ${timeLabel(currentTodayRecord.checkOut)}` : ' · Your workday is in progress'}` : 'You have not checked in today. Check in when you start work.'}</span></div></div><div className="d-flex flex-wrap gap-2">{!currentTodayRecord ? <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => markAttendance('in')}><i className="bi bi-box-arrow-in-right me-1" />{busy ? 'Saving…' : 'Check in'}</button> : !currentTodayRecord.checkOut ? <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => markAttendance('out')}><i className="bi bi-box-arrow-right me-1" />{busy ? 'Saving…' : 'Check out'}</button> : <StatusBadge status="COMPLETED" />}</div></div>}
    {!isEmployee && <div className="stats-grid stats-grid-three"><StatCard label="Records in this view" value={total} icon="bi-journal-check" /><StatCard label="Present today in loaded page" value={checkedInCount} icon="bi-person-check" tone="green" /><StatCard label="Date scope" value={dateFilter || 'All dates'} icon="bi-calendar3" tone="purple" /></div>}
    <div className="card-panel">
      <div className="panel-heading"><div><h2>{isEmployee ? 'My attendance history' : isHR ? 'Organization attendance' : 'Team attendance'}</h2><p>Records are based on actual check-ins saved in the database.</p></div><span className="status-badge status-primary">{total} RECORDS</span></div>
      <div className="panel-body"><div className="filter-row"><div className="filter-control"><label>Filter by date</label><input type="date" className="form-control" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} /></div>{isHR && <div className="filter-control"><label>Employee ID or name (optional)</label><input className="form-control" placeholder="e.g. SS-0004 or Maya" value={employeeFilter} onChange={(e) => { setEmployeeFilter(e.target.value.trim()); setPage(1); }} /></div>}<button className="btn btn-outline-secondary" onClick={() => { setDateFilter(''); setEmployeeFilter(''); setPage(1); }}><i className="bi bi-arrow-counterclockwise me-1" />Clear filters</button></div></div>
      {loading ? <Loading /> : items.length === 0 ? <EmptyState icon="bi-clock-history" title="No attendance records found" text={isEmployee ? 'Your check-in history will appear here after you record attendance.' : 'No records match the current filters. Employees are not automatically marked absent.'} /> : <div className="content-table-wrap"><table className="table"><thead><tr>{!isEmployee && <th>Employee</th>}<th>Date</th><th>Check in</th><th>Check out</th><th>Status</th><th>Duration</th>{isHR && <th>Correction</th>}</tr></thead><tbody>{items.map((item) => { const duration = item.checkOut ? Math.max(0, Math.round((new Date(item.checkOut) - new Date(item.checkIn)) / 60000)) : null; return <tr key={item._id}>{!isEmployee && <td><div className="person-cell"><div className="person-avatar">{item.employee?.user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</div><div><div className="person-name">{item.employee?.user?.name || 'Employee'}</div><div className="person-detail">{item.employee?.employeeId || ''}</div></div></div></td>}<td className="fw-semibold small">{item.attendanceDate}</td><td>{timeLabel(item.checkIn)}</td><td>{timeLabel(item.checkOut)}</td><td><StatusBadge status={item.status} /></td><td>{duration === null ? <span className="text-muted-small">In progress</span> : `${Math.floor(duration / 60)}h ${duration % 60}m`}</td>{isHR && <td><button className="btn btn-sm btn-outline-secondary" onClick={() => openCorrection(item)}><i className="bi bi-pencil-square me-1" />Edit</button></td>}</tr>; })}</tbody></table></div>}
      <div className="pagination-row"><span>Showing {items.length ? (page - 1) * 15 + 1 : 0}–{Math.min(page * 15, total)} of {total}</span><div className="pagination-actions"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button></div></div>
    </div>
    {correcting && <Modal title="Correct attendance record" subtitle={`Update the saved times for ${correcting.employee?.user?.name || 'this employee'} on ${correcting.attendanceDate}.`} onClose={() => setCorrecting(null)}><form onSubmit={saveCorrection}><div className="row g-3"><div className="col-md-6"><label className="form-label">Check-in time *</label><input type="datetime-local" className="form-control" required value={correction.checkIn} onChange={(e) => setCorrection({ ...correction, checkIn: e.target.value })} /></div><div className="col-md-6"><label className="form-label">Check-out time</label><input type="datetime-local" className="form-control" value={correction.checkOut} onChange={(e) => setCorrection({ ...correction, checkOut: e.target.value })} /></div><div className="col-md-6"><label className="form-label">Status</label><select className="form-select" value={correction.status} onChange={(e) => setCorrection({ ...correction, status: e.target.value })}><option value="PRESENT">Present</option><option value="EXCUSED">Excused</option></select></div><div className="col-12"><label className="form-label">Reason for correction *</label><textarea className="form-control" rows="3" minLength={5} required value={correction.reason} onChange={(e) => setCorrection({ ...correction, reason: e.target.value })} placeholder="Explain why this record needs to change" /></div></div><div className="form-actions"><button type="button" className="btn btn-light" onClick={() => setCorrecting(null)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save correction'}</button></div></form></Modal>}
  </>;
}
