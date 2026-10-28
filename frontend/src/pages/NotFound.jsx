import { Link } from 'react-router-dom';
export default function NotFound() {
  return <div className="not-found"><div className="not-found-mark"><i className="bi bi-compass" /></div><div className="eyebrow">PAGE NOT FOUND</div><h1>We couldn't find that page.</h1><p>The link may be outdated, or the page may have moved.</p><Link className="btn btn-primary" to="/dashboard">Back to your dashboard</Link></div>;
}
