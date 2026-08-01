import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, Collapse, Row, Steps, Tag } from 'antd';
import { IdcardOutlined, LockOutlined, SafetyCertificateOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { billingApi } from '../../api';
import { formatDisplay } from '../../api/currency';
import { useAuth } from '../../store/auth';
import { PageHeader, SectionHead } from '../../components/ui';
import { useT } from '../../i18n/useT';

export default function HowItWorks() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    // The creator packages are what is on sale now; there is no platform-wide
    // plan list, because viewers pay per item rather than by plan.
    billingApi.creatorPackages().then(setPackages).catch(() => setPackages([]));
  }, []);

  const cheapest = packages?.[0];

  const memberSteps = [
    { title: t('howItWorks.s1t'), description: t('howItWorks.s1d') },
    { title: t('howItWorks.s2t'), description: t('howItWorks.s2d') },
    { title: t('howItWorks.s3t'), description: t('howItWorks.s3d') },
    { title: t('howItWorks.s4t'), description: t('howItWorks.s4d') },
  ];

  const faq = [
    {
      key: 'why-id',
      label: t('howItWorks.q1'),
      children: t('howItWorks.a1'),
    },
    {
      key: 'free',
      label: t('howItWorks.q2'),
      children: t('howItWorks.a2'),
    },
    {
      key: 'unlock-vs-sub',
      label: t('howItWorks.q3'),
      children: t('howItWorks.a3', {
        price: cheapest ? formatDisplay(cheapest.priceDisplay, cheapest.currency) : '',
      }),
    },
    {
      key: 'pay',
      label: t('howItWorks.q4'),
      children: t('howItWorks.a4'),
    },
    {
      key: 'live',
      label: t('howItWorks.q5'),
      children: t('howItWorks.a5'),
    },
    {
      key: 'post',
      label: t('howItWorks.q6'),
      children: t('howItWorks.a6'),
    },
  ];

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <PageHeader
        title={t('howItWorks.title')}
        subtitle={t('howItWorks.sub')}
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <div className="glass" style={{ padding: 30, height: '100%' }}>
            <Tag icon={<IdcardOutlined />} color="gold">{t('howItWorks.gettingStarted')}</Tag>
            <h2 className="serif" style={{ fontSize: 27, margin: '16px 0 22px' }}>
              {t('howItWorks.fourSteps')}
            </h2>
            <Steps direction="vertical" size="small" current={-1} items={memberSteps} />
            {!user && (
              <div style={{ marginTop: 24 }}>
                <Button type="primary" onClick={() => navigate('/join')}>{t('landing.ctaButton')}</Button>
              </div>
            )}
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div className="glass" style={{ padding: 30, height: '100%' }}>
            <Tag icon={<LockOutlined />} color="gold">{t('howItWorks.pricing')}</Tag>
            <h2 className="serif" style={{ fontSize: 27, margin: '16px 0 20px' }}>
              {t('howItWorks.payForWhat')}
            </h2>

            <>
              <div className="kv-row">
                <span className="k">{t('howItWorks.oneVideo')}</span>
                <span className="v">{t('howItWorks.priceSetByHer')}</span>
              </div>
              <div className="kv-row">
                <span className="k">{t('howItWorks.oneBroadcast')}</span>
                <span className="v">{t('howItWorks.priceSetByHer')}</span>
              </div>
              {cheapest && (
                <div className="kv-row">
                  <span className="k">{t('howItWorks.creatorPackages')}</span>
                  <span className="v">
                    {t('howItWorks.packagesFrom', {
                      price: formatDisplay(cheapest.priceDisplay, cheapest.currency),
                    })}
                  </span>
                </div>
              )}
              <p className="faint" style={{ fontSize: 12.5, lineHeight: 1.7, marginTop: 18, marginBottom: 0 }}>
                {t('howItWorks.phoneConfirm')}
              </p>
            </>

            <div style={{ marginTop: 24 }}>
              <Button onClick={() => navigate(user ? '/me/billing' : '/join')}>
                {user ? t('howItWorks.seeMyOptions') : t('howItWorks.joinToUnlock')}
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <section className="section-tight" style={{ marginTop: 20 }}>
        <SectionHead eyebrow={t('howItWorks.safety')} title={t('howItWorks.safetyTitle')} />
        <Row gutter={[20, 20]}>
          {[
            {
              icon: <SafetyCertificateOutlined />,
              title: t('howItWorks.c1t'),
              body: t('howItWorks.c1d'),
            },
            {
              icon: <LockOutlined />,
              title: t('howItWorks.c2t'),
              body: t('howItWorks.c2d'),
            },
            {
              icon: <VideoCameraOutlined />,
              title: t('howItWorks.c3t'),
              body: t('howItWorks.c3d'),
            },
          ].map((c) => (
            <Col xs={24} md={8} key={c.title}>
              <div className="glass" style={{ padding: 24, height: '100%' }}>
                <span style={{ color: 'var(--gold)', fontSize: 20 }}>{c.icon}</span>
                <h3 style={{ fontSize: 17, margin: '14px 0 8px', fontWeight: 600 }}>{c.title}</h3>
                <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{c.body}</p>
              </div>
            </Col>
          ))}
        </Row>
      </section>

      <section className="section-tight">
        <SectionHead eyebrow={t('howItWorks.questions')} title={t('howItWorks.faqTitle')} />
        <Collapse items={faq} bordered={false} accordion expandIconPosition="end" style={{ background: 'transparent' }} />
      </section>
    </div>
  );
}
