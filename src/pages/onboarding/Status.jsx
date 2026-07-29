import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Result, Space, Tag } from 'antd';
import { CheckCircleFilled, HourglassOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { kycApi } from '../../api';
import { NEXT_STEP, VERIFICATION } from '../../api/config';
import { useAuth } from '../../store/auth';
import OnboardingShell from './OnboardingShell';
import { useT } from '../../i18n/useT';

/** Where a member waits. Polls /me so approval lands without a reload. */
export default function Status() {
  const t = useT();
  const { user, refresh } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    kycApi.getSubmission().then(setSubmission).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const check = async () => {
    setChecking(true);
    const u = await refresh();
    setChecking(false);
    if (u?.verificationStatus === VERIFICATION.PENDING_REVIEW) {
      message.info(t('onboarding.stillReviewing'));
    }
  };

  if (user?.verificationStatus === VERIFICATION.REJECTED || user?.nextStep === NEXT_STEP.RESUBMIT_KYC) {
    return (
      <OnboardingShell>
        <Result
          status="error"
          title={<span className="serif" style={{ fontSize: 28 }}>We couldn't verify that</span>}
          subTitle={submission?.guidance || t('onboarding.rejectedBody')}
          extra={
            <Button type="primary" onClick={() => navigate('/onboarding/verify')}>
              {t('common.retry')}
            </Button>
          }
        />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell>
      <div className="glass" style={{ padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <HourglassOutlined style={{ fontSize: 42, color: 'var(--gold)' }} />
          <h1 className="serif" style={{ fontSize: 30, margin: '18px 0 10px' }}>We're reviewing your documents</h1>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>
            A real person checks every submission. Most are decided within a day. You can browse in
            the meantime — you just can't post yet.
          </p>
          {submission?.submittedAt && (
            <Tag color="gold" style={{ marginTop: 14 }}>
              {t('onboarding.submittedAgo', { when: dayjs(submission.submittedAt).fromNow() })}
            </Tag>
          )}
        </div>

        <div style={{ marginTop: 30 }}>
          <div className="kv-row">
            <span className="k">{t('onboarding.handle')}</span>
            <span className="v">@{user?.username}</span>
          </div>
          <div className="kv-row">
            <span className="k">{t('onboarding.document')}</span>
            <span className="v">{submission?.documentType?.replace(/_/g, ' ') ?? '—'}</span>
          </div>
          <div className="kv-row">
            <span className="k">{t('onboarding.filesReceived')}</span>
            <span className="v">
              {submission?.uploadedDocuments?.length
                ? submission.uploadedDocuments.map((d) => (
                    <Tag key={d} color="green" style={{ marginInlineEnd: 4 }}>
                      <CheckCircleFilled /> {d.replace(/_/g, ' ').toLowerCase()}
                    </Tag>
                  ))
                : '—'}
            </span>
          </div>
        </div>

        <Alert
          type="info"
          showIcon
          style={{ marginTop: 22 }}
          message={t('onboarding.docsPrivateTitle')}
          description={t('onboarding.docsPrivateBody')}
        />

        <div style={{ textAlign: 'center', marginTop: 26 }}>
          <Space>
            <Button icon={<ReloadOutlined />} loading={checking} onClick={check}>
              {t('common.checkNow')}
            </Button>
            <Button onClick={() => navigate('/me/account')}>{t('onboarding.reviewProfile')}</Button>
          </Space>
          <div className="faint" style={{ fontSize: 12, marginTop: 12 }}>
            This page updates itself every few seconds. Browsing opens once you're approved.
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
