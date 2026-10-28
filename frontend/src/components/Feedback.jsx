export default function Feedback({ type = 'danger', children, onClose }) {
  if (!children) return null;
  return <div className={`alert alert-${type} d-flex align-items-start gap-2 py-2`} role="alert">
    <i className={`bi ${type === 'success' ? 'bi-check-circle' : type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle'} mt-1`} />
    <div className="flex-grow-1">{children}</div>
    {onClose && <button type="button" className="btn-close ms-auto" aria-label="Close" onClick={onClose} />}
  </div>;
}
