import { Button, Empty, Skeleton, Space } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, LockOutlined } from '@ant-design/icons';
import { useT } from '../i18n/useT';

export function PageHeader({ title, subtitle, extra, style }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 22,
        ...style,
      }}
    >
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          <div className="muted" style={{ fontSize: 13.5, marginTop: 6, maxWidth: 640 }}>
            {subtitle}
          </div>
        )}
      </div>
      {extra && <Space wrap>{extra}</Space>}
    </div>
  );
}

export function SectionHead({ eyebrow, title, action }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="section-title">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, delta, hint, icon, accent }) {
  const up = typeof delta === 'number' && delta >= 0;
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div className="stat-label">{label}</div>
        {icon && <span style={{ color: accent ?? 'var(--gold)', fontSize: 17, opacity: 0.9 }}>{icon}</span>}
      </div>
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {typeof delta === 'number' && (
        <div className="stat-delta" style={{ color: up ? 'var(--success)' : 'var(--danger)' }}>
          {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          {Math.abs(delta)}%
          <span className="faint" style={{ fontWeight: 400 }} />
        </div>
      )}
      {hint && !delta && (
        <div className="stat-delta faint" style={{ fontWeight: 400 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function Blank({ title, description, action, style }) {
  const t = useT();
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', ...style }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{title ?? t('common.nothingHere')}</div>
            {description && (
              <div className="muted" style={{ fontSize: 13 }}>
                {description}
              </div>
            )}
          </div>
        }
      >
        {action}
      </Empty>
    </div>
  );
}

export function GridSkeleton({ count = 8, ratio = '3 / 4' }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: 18,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            aspectRatio: ratio,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(160deg, #17161e, #101017)',
            border: '1px solid var(--line-soft)',
            padding: 14,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <Skeleton active paragraph={{ rows: 1, width: '70%' }} title={{ width: '55%' }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Shown when the API refuses a browse request.
 *
 * Anonymous callers get 401 and unverified members get 403
 * `verification_required`, so the same surface has to explain both without
 * looking like a crash.
 */
export function AccessGate({ error, signedIn, onJoin, onVerify }) {
  const t = useT();
  const needsVerification = error?.status === 403 || error?.needsVerification;

  return (
    <div className="glass" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          margin: '0 auto 18px',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--gold-wash)',
          border: '1px solid rgba(217,180,106,0.35)',
          color: 'var(--gold-bright)',
          fontSize: 22,
        }}
      >
        <LockOutlined />
      </div>

      <h2 className="serif" style={{ fontSize: 27, margin: '0 0 10px' }}>
        {needsVerification ? t('discover.gateVerifyTitle') : t('discover.gateJoinTitle')}
      </h2>
      <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, margin: '0 auto 22px', maxWidth: 420 }}>
        {needsVerification ? t('discover.gateVerifyBody') : t('discover.gateJoinBody')}
      </p>

      <Space wrap>
        {needsVerification ? (
          <Button type="primary" size="large" onClick={onVerify}>
            {t('discover.gateVerifyCta')}
          </Button>
        ) : (
          <>
            <Button type="primary" size="large" onClick={onJoin}>
              {t('discover.gateJoinCta')}
            </Button>
            {!signedIn && (
              <Button size="large" href="/login">
                {t('common.signIn')}
              </Button>
            )}
          </>
        )}
      </Space>
    </div>
  );
}

export function LoadMore({ onClick, loading, hidden }) {
  const t = useT();
  if (hidden) return null;
  return (
    <div style={{ textAlign: 'center', marginTop: 32 }}>
      <Button size="large" loading={loading} onClick={onClick} style={{ minWidth: 200 }}>
        {t('common.loadMore')}
      </Button>
    </div>
  );
}
