export default function StatCard({ label, value, icon = 'bi-bar-chart', hint, tone = 'blue' }) {
  return <div className={`stat-card tone-${tone}`}>
    <div className="stat-copy"><span className="stat-label">{label}</span><strong className="stat-value">{value ?? '—'}</strong>{hint && <span className="stat-hint">{hint}</span>}</div>
    <div className="stat-icon"><i className={`bi ${icon}`} /></div>
  </div>;
}
