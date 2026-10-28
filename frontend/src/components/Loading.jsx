export default function Loading({ label = 'Loading records…' }) {
  return <div className="loading-panel"><span className="spinner-border spinner-border-sm text-primary" role="status" /><span>{label}</span></div>;
}
