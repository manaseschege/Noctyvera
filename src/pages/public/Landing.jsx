import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, Row, Space } from 'antd';
import {
  ArrowRightOutlined,
  LockFilled,
  SafetyCertificateOutlined,
  UnlockOutlined,
  VideoCameraFilled,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { billingApi, membersApi } from '../../api';
import { humanDuration } from '../../api/billing';
import { formatDisplay } from '../../api/currency';
import { useI18n } from '../../i18n/useT';
import { BRAND } from '../../brand';
import { homeFor, useAuth } from '../../store/auth';
import HeroCollage from '../../components/HeroCollage';
import MemberCard from '../../components/MemberCard';
import { SectionHead } from '../../components/ui';

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const { user, entitlements } = useAuth();
  const { t, lang } = useI18n();
  const [plans, setPlans] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    billingApi.plans().then(setPlans).catch(() => {});
    // 401 while the browse endpoint is authenticated — the collage simply
    // falls back to placeholders until it opens up.
    membersApi
      .list({ page: 0, size: 8 })
      .then((r) => setMembers(r.items ?? []))
      .catch(() => setMembers([]));
  }, []);

  const cta = user ? homeFor(user, entitlements) : '/join';
  const currency = plans?.currency;

  return (
    <>
      <section className="hero">
        <div className="shell">
          <Row gutter={[48, 40]} align="middle">
            <Col xs={24} lg={13}>
              <motion.div className="hero-copy" initial="hidden" animate="show">
                <motion.div variants={fadeUp} custom={0} className="eyebrow">
                  {t('landing.eyebrow')}
                </motion.div>
                <motion.h1 variants={fadeUp} custom={1} className="display" style={{ marginTop: 18 }}>
                  {t('landing.titleA')}
                  <br />
                  <span className="gold-text">{t('landing.titleB')}</span>
                </motion.h1>
                <motion.p variants={fadeUp} custom={2} className="hero-sub">
                  {t('landing.sub')}
                </motion.p>
                <motion.div variants={fadeUp} custom={3}>
                  <Space size={12} wrap>
                    <Button type="primary" size="large" onClick={() => navigate(cta)} style={{ height: 46, padding: '0 26px' }}>
                      {user ? t('landing.goDiscover') : t('common.joinFree')} <ArrowRightOutlined />
                    </Button>
                    <Button size="large" onClick={() => navigate('/how-it-works')} style={{ height: 46, padding: '0 26px' }}>
                      {t('nav.howItWorks')}
                    </Button>
                  </Space>
                </motion.div>

                {plans && (
                  <motion.div variants={fadeUp} custom={4} className="hero-stats">
                    <div>
                      <div className="hero-stat-value">
                        {plans.freePreviewPhotos}
                      </div>
                      <div className="hero-stat-label">{t('landing.freePreviews', { count: plans.freePreviewPhotos ?? 1 })}</div>
                    </div>
                    {plans.profileUnlock && (
                      <div>
                        <div className="hero-stat-value">
                          {formatDisplay(plans.profileUnlock.priceDisplay, currency, lang)}
                        </div>
                        <div className="hero-stat-label">{t('landing.oneProfile', { duration: humanDuration(plans.profileUnlock.duration) })}</div>
                      </div>
                    )}
                    {plans.subscriptions?.[0] && (
                      <div>
                        <div className="hero-stat-value">
                          {formatDisplay(plans.subscriptions[0].priceDisplay, currency, lang)}
                        </div>
                        <div className="hero-stat-label">{t('landing.everyone', { label: plans.subscriptions[0].label })}</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </Col>
            <Col xs={0} lg={11}>
              <HeroCollage members={members} />
            </Col>
          </Row>
        </div>
      </section>

      {members.length > 0 && (
        <section className="section-tight">
          <div className="shell">
            <SectionHead
              eyebrow={t('landing.onPlatform', { brand: BRAND.name })}
              title={t('landing.whosHere')}
              action={
                <Button type="text" onClick={() => navigate('/discover')} style={{ color: 'var(--gold)' }}>
                  {t('landing.browseEveryone')} <ArrowRightOutlined />
                </Button>
              }
            />
            <div className="browse-grid">
              {members.slice(0, 8).map((m) => (
                <MemberCard key={m.userId} member={m} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="shell">
          <SectionHead eyebrow={t('nav.howItWorks')} title={t('landing.howTitle')} />
          <Row gutter={[24, 24]}>
            {[
              {
                icon: <SafetyCertificateOutlined />,
                title: t('landing.how1Title'),
                body: t('landing.how1Body'),
              },
              {
                icon: <LockFilled />,
                title: t('landing.how2Title'),
                body: t('landing.how2Body'),
              },
              {
                icon: <VideoCameraFilled />,
                title: t('landing.how3Title'),
                body: t('landing.how3Body'),
              },
            ].map((f, i) => (
              <Col xs={24} md={8} key={f.title}>
                <motion.div
                  className="glass"
                  style={{ padding: 28, height: '100%' }}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--gold-wash)',
                      border: '1px solid rgba(217,180,106,0.35)',
                      color: 'var(--gold-bright)',
                      fontSize: 19,
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="serif" style={{ fontSize: 22, margin: '18px 0 10px' }}>{f.title}</h3>
                  <p className="muted" style={{ fontSize: 14, lineHeight: 1.75, margin: 0 }}>{f.body}</p>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div
            className="glass"
            style={{
              padding: '48px 44px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 32,
              flexWrap: 'wrap',
              background: 'linear-gradient(120deg, rgba(217,180,106,0.1), rgba(22,21,29,0.7) 45%), rgba(22,21,29,0.72)',
            }}
          >
            <div style={{ maxWidth: 560 }}>
              <h2 className="serif" style={{ fontSize: 34, margin: '0 0 12px', lineHeight: 1.15 }}>
                {t('landing.ctaTitle')}
              </h2>
              <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.75, margin: 0 }}>
                {t('landing.ctaBody')}
              </p>
            </div>
            <Button type="primary" size="large" icon={<UnlockOutlined />} onClick={() => navigate(cta)} style={{ height: 48, padding: '0 30px' }}>
              {user ? t('nav.browseMembers') : t('landing.ctaButton')}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
