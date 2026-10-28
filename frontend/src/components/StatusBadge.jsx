const styles = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', PRESENT: 'success', EXCUSED: 'secondary',
  ACTIVE: 'success', INACTIVE: 'secondary', ENROLLED: 'primary', COMPLETED: 'success', CANCELLED: 'danger',
};
export default function StatusBadge({ status }) {
  const value = status || 'UNKNOWN';
  return <span className={`status-badge status-${(styles[value] || 'secondary').toLowerCase()}`}>{value.replaceAll('_', ' ')}</span>;
}
