import Brand from '../../components/Brand';
import { fallbackDataUri } from '../../components/placeholder';
import { BRAND } from '../../brand';
import { useT } from '../../i18n/useT';

/** Split-screen frame shared by the auth screens. */
export default function AuthShell({ children, quote, attribution, art = 'auth' }) {
  const t = useT();
  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <img src={fallbackDataUri(art, 'N')} alt="" />
        <div className="auth-art-scrim" />
        <div className="auth-art-copy">
          <div className="eyebrow" style={{ marginBottom: 16 }}>{BRAND.name}</div>
          <h2 className="serif" style={{ fontSize: 34, lineHeight: 1.2, margin: '0 0 14px', maxWidth: 460 }}>
            {quote}
          </h2>
          <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>{attribution}</p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-form">
          <div style={{ marginBottom: 30 }}>
            <Brand />
          </div>
          {children}
          <div className="faint" style={{ fontSize: 11.5, marginTop: 32, lineHeight: 1.7 }}>
            {t('auth.terms')}
          </div>
        </div>
      </div>
    </div>
  );
}
