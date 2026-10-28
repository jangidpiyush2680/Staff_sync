export default function Modal({ title, subtitle, onClose, children, size = 'normal' }) {
  return <div className="modal-backdrop-custom" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`modal-card-custom ${size === 'large' ? 'modal-large' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-heading-custom"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="modal-close-custom" type="button" aria-label="Close" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
      <div className="modal-content-custom">{children}</div>
    </section>
  </div>;
}
