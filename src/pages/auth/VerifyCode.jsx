import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, App, Button } from 'antd';
import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import CodeInput from '../../components/CodeInput';
import { OTP } from '../../api/config';
import { homeFor, useAuth } from '../../store/auth';
import AuthShell from './AuthShell';
import { useT } from '../../i18n/useT';

/**
 * Step two of signing in.
 *
 * Reached only with a live challenge in the store, so a direct visit bounces
 * back to the password screen rather than showing an empty code box.
 */
export default function VerifyCode() {
  const t = useT();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { challenge, verifyCode, resendCode, clearChallenge, busy } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  // Stops a paste-triggered auto-submit racing a click on the button.
  const submitting = useRef(false);

  // No challenge means a reload, or somebody typing the URL in.
  useEffect(() => {
    if (!challenge) navigate('/login', { replace: true });
  }, [challenge, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = useCallback(
    async (value) => {
      const entered = (value ?? code).trim();
      if (entered.length < (challenge?.codeLength ?? OTP.defaultLength)) return;
      if (submitting.current) return;

      submitting.current = true;
      setError(null);
      try {
        const user = await verifyCode(entered);
        const { entitlements, packageStatus } = useAuth.getState();
        message.success(t('auth.welcomeMessage'));
        navigate(location.state?.from ?? homeFor(user, { entitlements, packageStatus }), {
          replace: true,
        });
      } catch (e) {
        setError(e.message);
        // Wrong codes are worth retyping, not editing.
        setCode('');
      } finally {
        submitting.current = false;
      }
    },
    [code, challenge, verifyCode, message, t, navigate, location.state],
  );

  const resend = async () => {
    setError(null);
    try {
      await resendCode();
      setCode('');
      setCooldown(OTP.resendCooldownSeconds);
      message.success(t('auth.codeResent'));
    } catch (e) {
      setError(e.message);
    }
  };

  const startOver = () => {
    clearChallenge();
    navigate('/login', { replace: true });
  };

  if (!challenge) return null;

  return (
    <AuthShell quote={t('auth.codeQuote')} attribution={t('auth.codeQuoteSub')}>
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--gold-wash)',
          border: '1px solid rgba(217,180,106,0.35)',
          color: 'var(--gold-bright)',
          fontSize: 19,
          marginBottom: 18,
        }}
      >
        <MailOutlined />
      </div>

      <h1 className="serif" style={{ fontSize: 32, margin: '0 0 8px' }}>
        {t('auth.checkYourEmail')}
      </h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 26, lineHeight: 1.7 }}>
        {t('auth.codeSentTo')}{' '}
        <strong style={{ color: 'var(--text)' }}>{challenge.maskedEmail}</strong>.{' '}
        {t('auth.codeExpires')}
      </p>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} />}

      <CodeInput
        length={challenge.codeLength ?? OTP.defaultLength}
        value={code}
        onChange={setCode}
        onComplete={submit}
        disabled={busy}
      />

      <Button
        type="primary"
        block
        size="large"
        loading={busy}
        onClick={() => submit()}
        style={{ marginTop: 22 }}
        disabled={code.length < (challenge.codeLength ?? OTP.defaultLength)}
      >
        {t('common.signIn')}
      </Button>

      <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13.5 }} className="muted">
        {t('auth.noCode')}{' '}
        <Button
          type="link"
          size="small"
          style={{ padding: 0, color: cooldown ? 'var(--text-faint)' : 'var(--gold)' }}
          disabled={cooldown > 0 || busy}
          onClick={resend}
        >
          {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
        </Button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 26 }}>
        <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={startOver} className="muted">
          {t('auth.useDifferentAccount')}
        </Button>
      </div>
    </AuthShell>
  );
}
