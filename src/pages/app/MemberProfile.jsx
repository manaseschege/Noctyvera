import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App, Avatar, Button, Col, Divider, Masonry, Modal, Row, Segmented, Skeleton, Tag } from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  LockFilled,
  PictureOutlined,
  UnlockOutlined,
  VideoCameraFilled,
  WhatsAppOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { membersApi } from '../../api';

import { useAuth } from '../../store/auth';
import CheckoutModal from '../../components/CheckoutModal';
import MediaTile from '../../components/MediaTile';
import SmartImage from '../../components/SmartImage';
import VerifiedBadge from '../../components/VerifiedBadge';
import { AuthedImage, AuthedVideo } from '../../components/AuthedFile';
import { AccessGate, Blank, GridSkeleton } from '../../components/ui';
import { formatDisplay } from '../../api/currency';
import { useI18n } from '../../i18n/useT';

const vibeKey = (v) => (v ? `enums.vibe.${v}` : null);

/** MediaResponse -> the shape MediaTile expects. */
const toTile = (m) => ({
  id: m.id,
  title: m.caption || (m.type === 'VIDEO' ? 'Clip' : 'Photo'),
  type: m.type === 'VIDEO' ? 'video' : 'photo',
  mediaId: m.locked ? null : m.id,
  contentType: m.contentType,
  thumbUrl: null,
  url: null,
  unlocked: !m.locked,
  visibility: m.locked ? 'subscribers' : 'public',
  price: 0,
  likes: 0,
  views: 0,
  ratio: 0.8,
  createdAt: m.createdAt,
});

export default function MemberProfile() {
  const { t, lang } = useI18n();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user, entitlements, loadEntitlements } = useAuth();

  const [profile, setProfile] = useState(null);
  const [media, setMedia] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [checkout, setCheckout] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [gate, setGate] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m, l] = await Promise.all([
        membersApi.getProfile(userId),
        membersApi.getMedia(userId).catch(() => []),
        membersApi.getLive(userId).catch(() => []),
      ]);
      setProfile(p);
      setMedia(Array.isArray(m) ? m : m?.content ?? []);
      setSessions(Array.isArray(l) ? l : l?.content ?? []);
      setGate(null);
    } catch (e) {
      // Anonymous (401) or unverified (403): explain rather than bounce.
      if (e.status === 401 || e.status === 403) setGate(e);
      else {
        message.error(e.message);
        navigate('/discover', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [userId, message, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const isSelf = user?.id === userId;
  // Per item now: there is no "unlocked this creator" state, only tiles that
  // are open and tiles that are not.
  const unlocked = isSelf || media.every((m) => !m.locked);
  const lockedItems = media.filter((m) => m.locked);
  const liveNow = sessions.find((s) => s.status === 'LIVE');
  const coverId = media.find((m) => !m.locked && m.type === 'PHOTO')?.id ?? null;

  const tiles = media
    .filter((m) => (filter === 'all' ? true : m.type === filter))
    .map(toTile);

  /** Opens checkout for one specific tile. */
  const wantItem = (tile) => {
    if (!user) {
      navigate('/join', { state: { from: `/m/${userId}` } });
      return;
    }
    const item = media.find((m) => m.id === tile.id);
    if (!item) return;
    setCheckout({
      id: item.id,
      kind: 'media',
      title: item.caption || (item.type === 'VIDEO' ? t('common.clips') : t('common.photos')),
      priceMinor: item.priceMinor,
      priceDisplay: item.priceDisplay,
      currency: item.currency,
      creatorName: profile?.username,
    });
  };

  /** The cheapest locked thing, for the sidebar call to action. */
  const cheapest = media
    .filter((m) => m.locked && m.priceMinor != null)
    .sort((a, b) => a.priceMinor - b.priceMinor)[0];

  const openTile = (tile) => {
    if (tile.unlocked) setLightbox(tile);
    else wantItem(tile);
  };

  if (loading && !profile) {
    return (
      <div className="shell" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <Skeleton active avatar paragraph={{ rows: 4 }} />
        <div style={{ marginTop: 30 }}>
          <GridSkeleton count={8} ratio="1 / 1" />
        </div>
      </div>
    );
  }
  if (gate) {
    return (
      <div className="shell" style={{ paddingTop: 60, paddingBottom: 72 }}>
        <AccessGate
          error={gate}
          signedIn={!!user}
          onJoin={() => navigate('/join')}
          onVerify={() => navigate('/onboarding/verify')}
        />
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="shell" style={{ paddingTop: 26, paddingBottom: 72 }}>
      <div className="profile-cover">
        {coverId ? (
          <AuthedImage path={membersApi.filePath(coverId)} alt="" seed={userId} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <SmartImage src={null} alt="" seed={userId} />
        )}
      </div>

      <Row gutter={[28, 28]} style={{ marginTop: -62, position: 'relative', zIndex: 2 }}>
        <Col xs={24} lg={16}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Avatar size={112} className="profile-avatar">
              {profile.username?.[0]?.toUpperCase()}
            </Avatar>
            <div style={{ flex: 1, minWidth: 220, paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="serif" style={{ fontSize: 32, margin: 0, lineHeight: 1.1 }}>
                  {profile.displayName || profile.username}
                  {profile.verified && <VerifiedBadge size={17} />}
                </h1>
                {liveNow && (
                  <span className="pill pill-live">
                    <span className="live-dot" /> {t('profile.liveNow')}
                  </span>
                )}
                {unlocked && !isSelf && (
                  <Tag color="green" icon={<UnlockOutlined />}>{t('common.unlocked')}</Tag>
                )}
              </div>
              <div className="muted" style={{ fontSize: 13.5, marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>@{profile.username}</span>
                {profile.age ? <span>{profile.age}</span> : null}
                {profile.city && (
                  <span>
                    <EnvironmentOutlined /> {profile.city}
                    {profile.country ? `, ${profile.country}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile.bio && (
            <p style={{ fontSize: 15, lineHeight: 1.8, marginTop: 22, maxWidth: 640 }}>{profile.bio}</p>
          )}

          {profile.vibe && (
            <Tag style={{ borderRadius: 999, padding: '3px 12px', border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-muted)' }}>
              {t(vibeKey(profile.vibe))}
            </Tag>
          )}

          {/* Only when she published one. `noreferrer` matters here: without it
              wa.me is handed this profile's URL as the referrer. */}
          {profile.whatsappNumber && (
            <div style={{ marginTop: 16 }}>
              <Button
                size="large"
                icon={<WhatsAppOutlined />}
                href={whatsappLink(profile.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('common.whatsapp')}
              </Button>
            </div>
          )}

          <Row gutter={[16, 16]} style={{ marginTop: 26, maxWidth: 560 }}>
            {[
              { label: t('common.photos'), value: media.filter((m) => m.type === 'PHOTO').length },
              { label: t('common.clips'), value: media.filter((m) => m.type === 'VIDEO').length },
              { label: t('common.locked'), value: lockedItems.length },
              { label: t('profile.memberSince'), value: dayjs(profile.createdAt).format('MMM YYYY') },
            ].map((s) => (
              <Col xs={12} sm={6} key={s.label}>
                <div style={{ borderLeft: '2px solid var(--gold-wash)', paddingLeft: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{s.value}</div>
                  <div className="faint" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>
                    {s.label}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Col>

        {/* ── Access panel ── */}
        <Col xs={24} lg={8}>
          <div className="glass" style={{ padding: 24, position: 'sticky', top: 90 }}>
            {liveNow && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'rgba(255,77,106,0.1)',
                  border: '1px solid rgba(255,77,106,0.35)',
                  marginBottom: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
                  <span className="live-dot" /> {t('dashboard.liveRightNow')}
                </div>
                <div className="muted" style={{ fontSize: 12.5, margin: '6px 0 12px' }}>{liveNow.title}</div>
                <Button block type="primary" danger icon={<VideoCameraFilled />} onClick={() => navigate(`/live/${liveNow.id}`)}>
                  {t('profile.joinRoom')}
                </Button>
              </div>
            )}

            {isSelf ? (
              <>
                <div className="eyebrow">{t('profile.thisIsYou')}</div>
                <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, margin: '12px 0 18px' }}>
                  {t('profile.thisIsYouBody')}
                </p>
                <Button block size="large" onClick={() => navigate('/me/media')}>
                  {t('profile.manageMyPhotos')}
                </Button>
              </>
            ) : unlocked ? (
              <>
                <UnlockOutlined style={{ fontSize: 22, color: 'var(--success)' }} />
                <h3 className="serif" style={{ fontSize: 22, margin: '12px 0 8px' }}>{t('profile.fullAccess')}</h3>
                <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>
                  {entitlements?.onTrial
                    ? t('profile.fullAccessSub')
                    : t('profile.everythingOpen')}
                </p>
              </>
            ) : (
              <>
                <div className="eyebrow">{t('common.locked')}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>{lockedItems.length}</span>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {t('profile.lockedPosts', { count: lockedItems.length })}
                  </span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    t('profile.morePhotos', { count: media.filter((m) => m.type === 'PHOTO' && m.locked).length }),
                    t('profile.clipsCount', { count: media.filter((m) => m.type === 'VIDEO' && m.locked).length }),
                    t('profile.theirRooms'),
                  ].map((li) => (
                    <li key={li} style={{ display: 'flex', gap: 9, fontSize: 13.5, alignItems: 'center' }}>
                      <LockFilled style={{ color: 'var(--gold)', fontSize: 12 }} />
                      <span className="muted">{li}</span>
                    </li>
                  ))}
                </ul>

                {/* Her price, not a platform-wide one. Shown before the
                    button so nobody has to open a modal to find out. */}
                {cheapest && (
                  <div className="unlock-price">
                    <span className="unlock-price-amount">
                      {t('profile.fromPrice', {
                        price: formatDisplay(cheapest.priceDisplay, cheapest.currency, lang),
                      })}
                    </span>
                    <span className="unlock-price-note">
                      {t('profile.pricedPerItem')}
                    </span>
                  </div>
                )}

                <Button block size="large" type="primary" icon={<UnlockOutlined />}
                        onClick={() => cheapest && wantItem(cheapest)} disabled={!cheapest}>
                  {t('profile.getAccess')}
                </Button>
                <div className="faint" style={{ fontSize: 11.5, marginTop: 10, textAlign: 'center' }}>
                  {t('profile.getAccessHint')}
                </div>
              </>
            )}

            <Divider style={{ margin: '20px 0 14px' }} />
            <div className="kv-row">
              <span className="k">{t('profile.joined')}</span>
              <span className="v">{dayjs(profile.createdAt).format('MMM YYYY')}</span>
            </div>
            {profile.vibe && (
              <div className="kv-row">
                <span className="k">{t('profile.vibe')}</span>
                <span className="v">{t(vibeKey(profile.vibe))}</span>
              </div>
            )}
            <div className="kv-row">
              <span className="k">{t('common.verified')}</span>
              <span className="v">
                <ClockCircleOutlined /> {t(`enums.verification.${profile.verificationStatus}`)}
              </span>
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Gallery ── */}
      <div style={{ marginTop: 44 }}>
        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <div className="eyebrow">{t('profile.gallery')}</div>
            <h2 className="section-title">
              {t('profile.postsCount', { count: media.length })}
              {lockedItems.length > 0 && (
                <span className="muted" style={{ fontSize: 15, fontFamily: 'Inter', fontWeight: 400, marginLeft: 10 }}>
                  {t('profile.lockedSuffix', { count: lockedItems.length })}
                </span>
              )}
            </h2>
          </div>
          <Segmented
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'PHOTO', label: t('common.photos') },
              { value: 'VIDEO', label: t('common.clips') },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {tiles.length === 0 ? (
          <Blank title={t('profile.nothingPosted')} description={t('profile.nothingPostedBody')} />
        ) : (
          <Masonry
            gutter={16}
            columns={{ xs: 2, sm: 3, md: 4, lg: 4, xl: 5 }}
            items={tiles.map((t) => ({ key: t.id, data: t }))}
            itemRender={({ data }) => <MediaTile item={data} onOpen={openTile} />}
          />
        )}

        {lockedItems.length > 0 && !unlocked && !isSelf && (
          <div
            className="glass"
            style={{
              marginTop: 28,
              padding: 26,
              textAlign: 'center',
              background: 'linear-gradient(140deg, rgba(217,180,106,0.09), rgba(22,21,29,0.7))',
            }}
          >
            <PictureOutlined style={{ fontSize: 24, color: 'var(--gold)' }} />
            <h3 className="serif" style={{ fontSize: 24, margin: '12px 0 8px' }}>
              {t('profile.behindCurtain', { count: lockedItems.length })}
            </h3>
            <p className="muted" style={{ fontSize: 13.5, maxWidth: 440, margin: '0 auto 18px' }}>
              {t('profile.behindCurtainBody', { username: profile.username })}
            </p>
            <Button type="primary" size="large" disabled={!cheapest}
                    onClick={() => cheapest && wantItem(cheapest)}>
              {t('profile.seeOptions')}
            </Button>
          </div>
        )}
      </div>

      <Modal open={!!lightbox} onCancel={() => setLightbox(null)} footer={null} width={760} centered title={lightbox?.title} destroyOnHidden>
        {lightbox &&
          (lightbox.type === 'video' ? (
            <AuthedVideo
              path={membersApi.filePath(lightbox.mediaId)}
              mimeType={lightbox.contentType}
              style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: '68vh' }}
            />
          ) : (
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#0b0a0f' }}>
              <AuthedImage
                path={membersApi.filePath(lightbox.mediaId)}
                mimeType={lightbox.contentType}
                alt={lightbox.title}
                seed={lightbox.id}
                style={{ width: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block' }}
              />
            </div>
          ))}
      </Modal>

      <CheckoutModal
        open={Boolean(checkout)}
        item={checkout}
        onClose={() => setCheckout(null)}
        onSettled={async () => {
          await loadEntitlements();
          load();
        }}
      />
    </div>
  );
}

/**
 * A wa.me link from a number as the member typed it.
 *
 * WhatsApp wants digits only — no plus, no spaces, no brackets — so the
 * normalising happens here rather than on the way into the database. What
 * someone entered is what they see in their own settings; rewriting it on save
 * risks turning a number that works into one that does not, and leaves them
 * unable to recognise their own.
 */
function whatsappLink(number) {
  const digits = String(number ?? '').replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}
