export default function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-header d-flex flex-wrap align-items-end justify-content-between gap-3">
    <div><div className="eyebrow">{eyebrow || 'STAFFSYNC WORKSPACE'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <div className="page-header-action">{action}</div>}
  </div>;
}
