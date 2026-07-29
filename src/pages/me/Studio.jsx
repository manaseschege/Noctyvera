import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Col, Row, Skeleton } from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  EyeOutlined,
  LinkOutlined,
  PictureOutlined,
  UnlockOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { authApi, billingApi, liveApi, mediaApi } from '../../api';
import { MEDIA_STATUS } from '../../api/config';
import { useAuth } from '../../store/auth';
import { PageHeader } from '../../components/ui';
import { useT } from '../../i18n/useT';

/**
 * Creator overview — deliberately the same shape as the staff console's
 * Overview: a handful of big cards, each with a count, a plain description
 * and one way in. Anything that actually needs the creator's attention is
 * called out on the card itself rather than buried in a chart.
 */
export default function Studio() {
  const t = useT();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useAuth();

  const [media, setMedia] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [m, l, p, e] = await Promise.allSettled([
      mediaApi.mine(),
      liveApi.mine(),
      authApi.getProfile(),
      billingApi.entitlements(),
    ]);
    if (m.status === 'fulfilled') setMedia(Array.isArray(m.value) ? m.value : m.value?.content ?? []);
    if (l.status === 'fulfilled') setSessions(Array.isArray(l.value) ? l.value : l.value?.content ?? []);
    if (p.status === 'fulfilled') setProfile(p.value);
    if (e.status === 'fulfilled') setEntitlements(e.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

  const approved = media.filter((m) => m.status === MEDIA_STATUS.APPROVED);
  const pending = media.filter((m) => m.status === MEDIA_STATUS.PENDING_REVIEW);
  const rejected = media.filter((m) => m.status === MEDIA_STATUS.REJECTED);
  const liveNow = sessions.find((s) => s.status === 'LIVE');
  const scheduled = sessions.filter((s) => s.status === 'SCHEDULED');

  const profileChecks = [
    approved.some((m) => m.type === 'PHOTO'),
    Boolean(profile?.bio?.trim()),
    Boolean(profile?.city?.trim()),
    Boolean(profile?.vibe),
    profile?.discoverable !== false,
  ];
  const profileDone = profileChecks.filter(Boolean).length;
  const profilePct = Math.round((profileDone / profileChecks.length) * 100);

  const cards = [
    {
      key: 'media',
      icon: <PictureOutlined />,
      title: t('nav.myPhotos'),
      count: approved.length,
      unit: t('studio.livePosts', { count: approved.length }),
      body:
        rejected.length > 0
          ? t('studio.rejectedBody', { count: rejected.length })
          : pending.length > 0
            ? t('studio.pendingBody', { count: pending.length })
            : approved.length === 0
              ? t('studio.noPostsBody')
              : t('studio.allLiveBody'),
      attention: rejected.length > 0 || approved.length === 0,
      action: approved.length === 0 ? t('studio.uploadFirst') : t('studio.managePhotos'),
      to: '/studio/media',
    },
    {
      key: 'live',
      icon: <VideoCameraOutlined />,
      title: t('studio.liveRooms'),
      count: liveNow ? t('studio.subActive') : sessions.length,
      unit: liveNow ? t('studio.rightNow') : t('studio.sessions', { count: sessions.length }),
      body: liveNow
        ? t('studio.youAreLive', { title: liveNow.title })
        : scheduled.length > 0
          ? t('studio.scheduledBody', { count: scheduled.length })
          : t('studio.hostBody'),
      attention: Boolean(liveNow),
      action: liveNow ? t('studio.manageSession') : t('studio.startRoom'),
      to: '/studio/live',
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      title: t('studio.myProfile'),
      count: `${profilePct}%`,
      unit: t('studio.complete'),
      body:
        profilePct === 100
          ? t('studio.profileComplete')
          : t('studio.profileLeft', { count: profileChecks.length - profileDone }),
      attention: profilePct < 100,
      action: profilePct === 100 ? t('studio.editProfile') : t('studio.finishProfile'),
      to: '/studio/account',
    },
    {
      key: 'billing',
      icon: <UnlockOutlined />,
      title: t('nav.accessPayments'),
      count: entitlements?.subscribed ? t('studio.subActive') : entitlements?.unlockedMembers?.length ?? 0,
      unit: entitlements?.subscribed ? t('studio.subUnit') : t('studio.unlockedUnit'),
      body: entitlements?.subscribed
        ? t('studio.subBody')
        : t('studio.billingBody'),
      attention: false,
      action: t('common.view'),
      to: '/studio/billing',
    },
  ];

  const needsAttention = cards.filter((c) => c.attention);

  return (
    <>
      <PageHeader
        title={t('studio.title')}
        subtitle={
          needsAttention.length === 0
            ? t('studio.upToDate')
            : t('studio.needsAttention', { count: needsAttention.length })
        }
        extra={
          <>
            <Button
              icon={<LinkOutlined />}
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/m/${user?.id}`);
                message.success(t('studio.linkCopied'));
              }}
            >
              {t('common.share')}
            </Button>
            <Button type="primary" icon={<EyeOutlined />} onClick={() => navigate(`/m/${user?.id}`)}>
              {t('studio.viewAsVisitor')}
            </Button>
          </>
        }
      />

      {needsAttention.length === 0 && (
        <div
          className="glass"
          style={{ padding: 34, textAlign: 'center', marginBottom: 24, borderColor: 'rgba(79,209,139,0.3)' }}
        >
          <CheckCircleFilled style={{ fontSize: 32, color: 'var(--success)' }} />
          <h2 className="serif" style={{ fontSize: 26, margin: '14px 0 8px' }}>{t('studio.allGood')}</h2>
          <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
            {t('studio.allGoodBody')}
          </p>
        </div>
      )}

      <Row gutter={[18, 18]}>
        {cards.map((c) => (
          <Col xs={24} md={12} xl={6} key={c.key}>
            <button
              type="button"
              onClick={() => navigate(c.to)}
              className="glass"
              style={{
                width: '100%',
                height: '100%',
                padding: 24,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
                borderColor: c.attention ? 'rgba(217,180,106,0.4)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background: c.attention ? 'var(--gold-wash)' : 'rgba(255,255,255,0.04)',
                    color: c.attention ? 'var(--gold-bright)' : 'var(--text-muted)',
                    fontSize: 19,
                  }}
                >
                  {c.icon}
                </span>
                <span
                  style={{
                    fontSize: typeof c.count === 'number' ? 34 : 22,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    color: c.attention ? 'var(--gold-bright)' : 'var(--text-faint)',
                    textAlign: 'right',
                  }}
                >
                  {c.count}
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 500, letterSpacing: 0, color: 'var(--text-faint)', marginTop: 4 }}>
                    {c.unit}
                  </span>
                </span>
              </div>

              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 18 }}>{c.title}</div>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.65, margin: '6px 0 16px' }}>
                {c.body}
              </p>

              <span style={{ color: c.attention ? 'var(--gold)' : 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
                {c.action} <ArrowRightOutlined />
              </span>
            </button>
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 24 }}>
        <Button onClick={load}>{t('common.refresh')}</Button>
      </div>
    </>
  );
}
