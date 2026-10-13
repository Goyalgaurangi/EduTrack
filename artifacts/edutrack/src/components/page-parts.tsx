import { type ReactNode } from 'react';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingPanel({ label = 'Loading academic records' }: { label?: string }) {
  return (
    <div className="loading-panel" role="status" data-testid="status-loading">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line short" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorPanel({ onRetry, label = 'The records could not be loaded.' }: { onRetry?: () => void; label?: string }) {
  return (
    <div className="state-panel error-panel" role="alert" data-testid="status-error">
      <span className="state-icon"><AlertCircle size={19} /></span>
      <div>
        <strong>We couldn’t reach the workspace.</strong>
        <p>{label}</p>
      </div>
      {onRetry && <button className="button button-soft" onClick={onRetry} data-testid="button-retry"><RefreshCw size={15} /> Try again</button>}
    </div>
  );
}

export function EmptyPanel({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-panel" data-testid="status-empty">
      <div className="empty-orbit"><span /><span /><span /></div>
      <div className="eyebrow">NOTHING HERE YET</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="text-link" href={href}>
      {children}<ArrowRight size={14} />
    </Link>
  );
}

export function Metric({
  label,
  value,
  suffix,
  detail,
  tone = 'navy',
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  detail?: string;
  tone?: 'navy' | 'sage' | 'amber' | 'coral';
  icon?: ReactNode;
}) {
  return (
    <div className={`metric-card metric-${tone}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="metric-top">
        <span>{label}</span>
        {icon && <span className="metric-icon">{icon}</span>}
      </div>
      <div className="metric-value">{value}<small>{suffix}</small></div>
      {detail && <div className="metric-detail">{detail}</div>}
    </div>
  );
}
