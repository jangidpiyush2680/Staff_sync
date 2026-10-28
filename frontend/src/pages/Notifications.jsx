import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import Feedback from '../components/Feedback';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

const iconMap = { LEAVE: 'bi-calendar2-check', ANNOUNCEMENT: 'bi-megaphone', TRAINING: 'bi-mortarboard', INFO: 'bi-info-circle' };
export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get('/notifications'); setItems(data.items || []); setUnreadCount(data.unreadCount || 0); }
    catch (err) { setError(getErrorMessage(err, 'Unable to load notifications.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function markRead(item) {
    if (item.isRead) return;
    setError('');
    try { await api.patch(`/notifications/${item._id}/read`); setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, isRead: true } : entry)); setUnreadCount((count) => Math.max(0, count - 1)); }
    catch (err) { setError(getErrorMessage(err, 'Unable to update this notification.')); }
  }
  async function markAllRead() {
    setError(''); setSuccess('');
    try { const { data } = await api.patch('/notifications/read-all'); setItems((current) => current.map((item) => ({ ...item, isRead: true }))); setUnreadCount(0); setSuccess(data.message); }
    catch (err) { setError(getErrorMessage(err, 'Unable to mark notifications as read.')); }
  }
  const visible = unreadOnly ? items.filter((item) => !item.isRead) : items;
  return <>
    <PageHeader eyebrow="PERSONAL INBOX" title="Notifications" description="Keep track of important decisions and messages related to your StaffSync account." action={<div className="d-flex gap-2"><button className={`btn ${unreadOnly ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setUnreadOnly((value) => !value)}><i className="bi bi-funnel me-2" />{unreadOnly ? 'Unread only' : 'All notifications'}</button><button className="btn btn-outline-secondary" onClick={markAllRead} disabled={!unreadCount}><i className="bi bi-check2-all me-2" />Mark all read</button></div>} />
    <div className="feedback-stack"><Feedback>{error}</Feedback><Feedback type="success">{success}</Feedback></div>
    <div className="card-panel"><div className="panel-heading"><div><h2>Your inbox</h2><p>{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}</p></div><span className="status-badge status-primary">{items.length} TOTAL</span></div>
      {loading ? <Loading /> : visible.length === 0 ? <EmptyState icon="bi-bell-slash" title={unreadOnly ? 'You are all caught up' : 'No notifications yet'} text={unreadOnly ? 'There are no unread notifications in your inbox.' : 'Leave decisions and other updates will appear here when they are available.'} /> : <div className="notification-list">{visible.map((item) => <button className={`notification-row ${item.isRead ? '' : 'notification-unread'}`} key={item._id} onClick={() => markRead(item)}><div className={`notification-icon ${item.isRead ? '' : 'notification-icon-unread'}`}><i className={`bi ${iconMap[item.type] || iconMap.INFO}`} /></div><div className="notification-main"><div className="notification-title-row"><strong>{item.title}</strong>{!item.isRead && <span className="notification-dot" />}</div><p>{item.message}</p><span className="notification-time">{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><div className="notification-side">{item.isRead ? <StatusBadge status="COMPLETED" /> : <span className="notification-mark">Mark read</span>}</div></button>)}</div>}
    </div>
  </>;
}
