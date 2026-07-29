import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App, Avatar, Button, Col, Result, Row, Space, Spin, Tag } from 'antd';
import { ArrowLeftOutlined, LockFilled, UnlockOutlined } from '@ant-design/icons';
import { liveApi, membersApi } from '../../api';
import { useAuth } from '../../store/auth';
import CheckoutModal from '../../components/CheckoutModal';
import SmartImage from '../../components/SmartImage';
import { useT } from '../../i18n/useT';

const elapsed = (iso) => {
  if (!iso) return '';
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function LiveRoom() {
  const t = useT();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { loadEntitlements } = useAuth();

  const [session, setSession] = useState(null);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState(false);
  const [host, setHost] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dir = await liveApi.directory({ size: 60 });
      const s = dir.items.find((x) => x.id === sessionId);
      if (!s) {
        message.info(t('liveRoom.ended'));
        navigate('/live', { replace: true });
        return;
      }
      setSession(s);

      // The playback endpoint is the real gate: null means "not entitled".
      const p = await liveApi.playback(sessionId);
      setStream(p);

      if (s.hostId) membersApi.getProfile(s.hostId).then(setHost).catch(() => {});
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, message, navigate, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="center-page">
        <Spin size="large" />
      </div>
    );
  }
  if (!session) return null;

  if (session.status === 'ENDED' || session.status === 'CANCELLED') {
    return (
      <div className="center-page">
        <Result
          status="info"
          title={t('liveRoom.ended')}
          subTitle={t('liveRoom.endedBody')}
          extra={<Button type="primary" onClick={() => navigate('/live')}>{t('liveRoom.seeRooms')}</Button>}
        />
      </div>
    );
  }

  const locked = !stream;
  const playbackUrl = stream?.playbackUrl ?? stream?.url ?? null;

  return (
    <div className="shell" style={{ paddingTop: 26, paddingBottom: 64 }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/live')} style={{ marginBottom: 16, color: 'var(--text-muted)' }}>
        {t('liveRoom.allRooms')}
      </Button>

      <Row gutter={[22, 22]}>
        <Col xs={24} lg={16}>
          <div className="live-stage">
            {!locked && playbackUrl ? (
              <video src={playbackUrl} controls autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
            ) : (
              <SmartImage src={null} alt={session.title} seed={session.id} label={session.hostUsername} />
            )}

            {locked && (
              <div className="live-locked-scrim">
                <div style={{ maxWidth: 380 }}>
                  <span className="media-lock-icon" style={{ margin: '0 auto 16px' }}>
                    <LockFilled />
                  </span>
                  <h2 className="serif" style={{ fontSize: 28, margin: '0 0 10px' }}>
                    {t('liveRoom.doorClosed')}
                  </h2>
                  <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 20 }}>
                    {t('liveRoom.doorClosedBody', { username: session.hostUsername })}
                  </p>
                  <Button type="primary" size="large" icon={<UnlockOutlined />} onClick={() => setCheckout(true)}>
                    {t('profile.getAccess')}
                  </Button>
                </div>
              </div>
            )}

            {!locked && (
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 8, zIndex: 3 }}>
                <span className="pill pill-live">
                  <span className="live-dot" /> {t('common.live').toUpperCase()} · {elapsed(session.startedAt)}
                </span>
              </div>
            )}
          </div>

          {!locked && !playbackUrl && (
            <div className="glass" style={{ padding: 16, marginTop: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t('liveRoom.notStarted')}</div>
              <div className="faint" style={{ fontSize: 12.5, marginTop: 4 }}>
                {t('liveRoom.notStartedBody')}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar size={48}>{session.hostUsername?.[0]?.toUpperCase()}</Avatar>
              <div>
                <div style={{ fontWeight: 600 }}>@{session.hostUsername}</div>
                <div className="muted" style={{ fontSize: 13 }}>{session.title}</div>
              </div>
            </div>
            <Space wrap>
              <Tag color={session.status === 'LIVE' ? 'red' : 'default'}>{t(`enums.sessionStatus.${session.status}`)}</Tag>
              {session.hostId && (
                <Button onClick={() => navigate(`/m/${session.hostId}`)}>{t('liveRoom.viewProfile')}</Button>
              )}
            </Space>
          </div>
        </Col>

        <Col xs={24} lg={8}>
          <div className="glass" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px' }}>{t('liveRoom.aboutRoom')}</h3>
            <div className="kv-row">
              <span className="k">{t('liveRoom.host')}</span>
              <span className="v">@{session.hostUsername}</span>
            </div>
            <div className="kv-row">
              <span className="k">{t('liveRoom.status')}</span>
              <span className="v">{t(`enums.sessionStatus.${session.status}`)}</span>
            </div>
            {session.startedAt && (
              <div className="kv-row">
                <span className="k">{t('liveRoom.onAirFor')}</span>
                <span className="v">{elapsed(session.startedAt)}</span>
              </div>
            )}
            {host?.city && (
              <div className="kv-row">
                <span className="k">{t('liveRoom.from')}</span>
                <span className="v">{host.city}</span>
              </div>
            )}
            <div className="kv-row">
              <span className="k">{t('liveRoom.access')}</span>
              <span className="v" style={{ color: locked ? 'var(--gold)' : 'var(--success)' }}>
                {locked ? t('common.locked') : t('liveRoom.openToYou')}
              </span>
            </div>
          </div>
        </Col>
      </Row>

      <CheckoutModal
        open={checkout}
        member={host ?? { userId: session.hostId, username: session.hostUsername }}
        onClose={() => setCheckout(false)}
        onSettled={async () => {
          await loadEntitlements();
          load();
        }}
      />
    </div>
  );
}
