import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Feedback from '../components/Feedback';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/dashboard/reports').then(({ data: report }) => setData(report)).catch((err) => setError(getErrorMessage(err, 'Unable to load reports.'))).finally(() => setLoading(false));
  }, []);
  const maxDept = Math.max(1, ...(data?.departments || []).map((item) => item.count));
  const maxAttend = Math.max(1, ...(data?.attendanceByDate || []).map((item) => item.count));
  return <>
    <PageHeader eyebrow="PEOPLE ANALYTICS" title="Reports & analytics" description="A simple view of the real employee, attendance, and leave records stored in MongoDB." action={<button className="btn btn-outline-secondary" onClick={() => window.print()}><i className="bi bi-printer me-2" />Print report</button>} />
    <Feedback>{error}</Feedback>
    {loading ? <Loading label="Calculating reports from database records…" /> : data && <>
      <div className="stats-grid"><StatCard label="Active employee profiles" value={data.totalEmployees} icon="bi-people" /><StatCard label="Pending leaves" value={data.leaves.PENDING} icon="bi-hourglass-split" tone="orange" /><StatCard label="Approved leaves" value={data.leaves.APPROVED} icon="bi-check2-circle" tone="green" /><StatCard label="Rejected leaves" value={data.leaves.REJECTED} icon="bi-x-circle" tone="red" /></div>
      <div className="reports-grid"><section className="card-panel"><div className="panel-heading"><div><h2>Department distribution</h2><p>Active employee profiles by department.</p></div></div><div className="panel-body">{data.departments.length ? <div className="bar-list">{data.departments.map((dept) => <div className="bar-row" key={dept._id}><div className="bar-row-label"><span>{dept._id || 'Unassigned'}</span><strong>{dept.count}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${(dept.count / maxDept) * 100}%` }} /></div></div>)}</div> : <EmptyState title="No employee data" text="Department statistics will appear after employee profiles are created." />}</div></section>
        <section className="card-panel"><div className="panel-heading"><div><h2>Leave request status</h2><p>Current request counts by status.</p></div></div><div className="panel-body"><div className="leave-count-list">{[['PENDING', data.leaves.PENDING], ['APPROVED', data.leaves.APPROVED], ['REJECTED', data.leaves.REJECTED]].map(([status, count]) => <div className="leave-count-row" key={status}><StatusBadge status={status} /><strong>{count}</strong></div>)}</div><div className="report-note"><i className="bi bi-info-circle me-1" />Counts reflect saved requests and update when the report is refreshed.</div></div></section></div>
      <section className="card-panel section-gap"><div className="panel-heading"><div><h2>Attendance activity · last 7 dates</h2><p>Count of persisted attendance entries by date. This is not an absence report.</p></div></div><div className="panel-body">{data.attendanceByDate.length ? <div className="attendance-bars">{data.attendanceByDate.map((row) => <div className="attendance-bar-column" key={row._id}><strong>{row.count}</strong><div className="attendance-bar-track"><div className="attendance-bar-fill" style={{ height: `${Math.max(5, (row.count / maxAttend) * 100)}%` }} /></div><span>{new Date(`${row._id}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></div>)}</div> : <EmptyState icon="bi-calendar3" title="No attendance data yet" text="Attendance entries will be summarized here as employees check in." />}</div></section>
      <div className="report-note mt-3"><i className="bi bi-shield-check me-1" />{data.note}</div>
    </>}
  </>;
}
