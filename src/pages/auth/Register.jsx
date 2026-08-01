import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Checkbox, Form, Input } from 'antd';
import {
  CheckCircleFilled,
  EyeFilled,
  LockOutlined,
  MailOutlined,
  VideoCameraFilled,
} from '@ant-design/icons';
import { ACCOUNT_TYPE } from '../../api/config';
import { useAuth } from '../../store/auth';
import AuthShell from './AuthShell';
import { useT } from '../../i18n/useT';

/**
 * Signing up.
 *
 * The account type is the only question here that changes anything, and it
 * is asked first, because the two answers lead to completely different
 * products:
 *
 *   **Watch** — email, password, done. Straight to the feed. No profile,
 *   no date of birth, no documents, and nothing to pay until they find
 *   somebody they actually want to see.
 *
 *   **Create** — the same two fields, then profile → identity → package.
 *
 * `?as=creator` preselects the second, so the landing page's creator call to
 * action lands people on the right form.
 */
export default function Register() {
  const t = useT();
  const { message } = App.useApp();
  const { register, busy } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [accountType, setAccountType] = useState(
    params.get('as') === 'creator' ? ACCOUNT_TYPE.CREATOR : ACCOUNT_TYPE.VIEWER,
  );
  const [error, setError] = useState(null);

  const creator = accountType === ACCOUNT_TYPE.CREATOR;

  const submit = async ({ email, password }) => {
    setError(null);
    try {
      const { auth } = await register({ email, password, accountType });
      message.success(t('auth.accountCreated', { username: auth.username }));
      // A viewer is finished; a creator has onboarding ahead of them.
      navigate(creator ? '/onboarding/profile' : '/discover', { replace: true });
    } catch (e) {
      setError(e.fieldErrors ? Object.values(e.fieldErrors).join(' ') : e.message);
    }
  };

  const perks = creator
    ? [t('auth.creatorPerk1'), t('auth.creatorPerk2'), t('auth.creatorPerk3')]
    : [t('auth.viewerPerk1'), t('auth.viewerPerk2'), t('auth.viewerPerk3')];

  return (
    <AuthShell
      art={68}
      quote={creator ? t('auth.creatorQuote') : t('auth.joinQuote')}
      attribution={creator ? t('auth.creatorQuoteSub') : t('auth.joinQuoteSub')}
    >
      <h1 className="serif" style={{ fontSize: 32, margin: '0 0 8px' }}>{t('auth.createTitle')}</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
        {creator ? t('auth.createSubCreator') : t('auth.createSubViewer')}
      </p>

      {/* The one branching question, asked before anything is typed. */}
      <div className="intent-picker">
        <button
          type="button"
          className={`intent-option${creator ? '' : ' is-active'}`}
          onClick={() => setAccountType(ACCOUNT_TYPE.VIEWER)}
          aria-pressed={!creator}
        >
          <EyeFilled />
          <span className="intent-title">{t('auth.iWantToWatch')}</span>
          <span className="intent-sub">{t('auth.iWantToWatchSub')}</span>
        </button>
        <button
          type="button"
          className={`intent-option${creator ? ' is-active' : ''}`}
          onClick={() => setAccountType(ACCOUNT_TYPE.CREATOR)}
          aria-pressed={creator}
        >
          <VideoCameraFilled />
          <span className="intent-title">{t('auth.iWantToCreate')}</span>
          <span className="intent-sub">{t('auth.iWantToCreateSub')}</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, margin: '22px 0 24px' }}>
        {perks.map((s) => (
          <div key={s} style={{ display: 'flex', gap: 9, fontSize: 13.5, alignItems: 'flex-start' }}>
            <CheckCircleFilled style={{ color: 'var(--gold)', fontSize: 13, marginTop: 4 }} />
            <span className="muted">{s}</span>
          </div>
        ))}
      </div>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} />}

      <Form layout="vertical" onFinish={submit} requiredMark={false} size="large">
        <Form.Item
          name="email"
          label={t('common.email')}
          rules={[{ required: true, message: t('auth.enterEmail') }, { type: 'email', message: t('auth.badEmail') }]}
        >
          <Input prefix={<MailOutlined style={{ color: 'var(--text-faint)' }} />} placeholder={t('auth.emailPlaceholder')} autoComplete="email" />
        </Form.Item>

        <Form.Item
          name="password"
          label={t('common.password')}
          // The server wants 10+ with a letter and a digit; saying so up front
          // beats a round trip to be told.
          extra={<span className="faint" style={{ fontSize: 12 }}>{t('auth.passwordRule')}</span>}
          rules={[
            { required: true, message: t('auth.choosePassword') },
            { min: 10, message: t('auth.passwordMin') },
            { pattern: /[A-Za-z]/, message: t('auth.passwordLetter') },
            { pattern: /\d/, message: t('auth.passwordDigit') },
          ]}
        >
          <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-faint)' }} />} placeholder="••••••••" autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          name="adult"
          valuePropName="checked"
          rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error(t('auth.adultRequired')))) }]}
        >
          <Checkbox>
            <span style={{ fontSize: 13 }}>{t('auth.confirmAdult')}</span>
          </Checkbox>
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large" loading={busy}>
          {creator ? t('auth.startCreating') : t('auth.startBrowsing')}
        </Button>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5 }} className="muted">
        {t('auth.alreadyMember')} <Link to="/login" style={{ color: 'var(--gold)' }}>{t('common.signIn')}</Link>
      </div>
    </AuthShell>
  );
}
