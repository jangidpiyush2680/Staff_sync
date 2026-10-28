export default function EmptyState({ icon = 'bi-inbox', title = 'Nothing here yet', text = 'Records will appear here when they are available.' }) {
  return <div className="empty-state"><div className="empty-icon"><i className={`bi ${icon}`} /></div><strong>{title}</strong><span>{text}</span></div>;
}
