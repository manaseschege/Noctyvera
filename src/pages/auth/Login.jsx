import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { homeFor, useAuth } from '../../store/auth';
import AuthShell from './AuthShell';
import { useT } from '../../i18n/useT';

export default function Login() {
  const t = useT();
  const { message } = App.useApp();
  const { login, busy } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);

  const submit = async (values) => {
    setError(null);
    try {
      const user = await login(values);
      // login() resolves after entitlements load, so read them fresh —
      // homeFor needs both to tell "activate" from "go to the dashboard".
      const { entitlements } = useAuth.getState();
      message.success(t('auth.welcomeMessage'));
      navigate(location.state?.from ?? homeFor(user, entitlements), { replace: true });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <AuthShell
      quote={t('auth.quote')}
      attribution={t('auth.quoteSub')}
    >
      <h1 className="serif" style={{ fontSize: 32, margin: '0 0 8px' }}>{t('auth.welcomeBack')}</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 26 }}>Sign in to your account.</p>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} />}

      <Form layout="vertical" onFinish={submit} requiredMark={false} size="large">
        <Form.Item
          name="email"
          label={t('common.email')}
          rules={[{ required: true, message: t('auth.enterEmail') }, { type: 'email', message: t('auth.badEmail') }]}
        >
          <Input prefix={<MailOutlined style={{ color: 'var(--text-faint)' }} />} placeholder={t('auth.emailPlaceholder')} autoComplete="email" />
        </Form.Item>

        <Form.Item name="password" label={t('common.password')} rules={[{ required: true, message: t('auth.enterPassword') }]}>
          <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-faint)' }} />} placeholder="••••••••" autoComplete="current-password" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large" loading={busy} style={{ marginTop: 6 }}>
          {t('common.signIn')}
        </Button>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5 }} className="muted">
        {t('auth.newHere')} <Link to="/join" style={{ color: 'var(--gold)' }}>{t('auth.createAccount')}</Link>
      </div>
    </AuthShell>
  );
}
