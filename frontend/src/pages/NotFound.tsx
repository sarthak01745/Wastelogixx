import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="auth-page">
      <div className="auth-card text-center">
        <div className="eyebrow">404</div>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-ink">This route left the corridor</h1>
        <p className="mt-4 text-sm text-ink-muted">The page you asked for is outside the approved operating zone.</p>
        <Link className="neo-button mt-8 inline-flex bg-ink text-paper" to="/">
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
