import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Checkbox, Form, Input } from 'antd';
import { CheckCircleFilled, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../../store/auth';
import AuthShell from './AuthShell';
import { useT } from '../../i18n/useT';

export default function Register() {
  const t = useT();
  const { message } = App.useApp();
  const { register, busy } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const submit = async ({ email, password }) => {
    setError(null);
    try {
      const { auth } = await register({ email, password });
      message.success(t('auth.accountCreated', { username: auth.username }));
      navigate('/onboarding/profile', { replace: true });
    } catch (e) {
      setError(e.fieldErrors ? Object.values(e.fieldErrors).join(' ') : e.message);
    }
  };

  return (
    <AuthShell
      art={68}
      quote={t('auth.joinQuote')}
      attribution={t('auth.joinQuoteSub')}
    >
      <h1 className="serif" style={{ fontSize: 32, margin: '0 0 8px' }}>{t('auth.createTitle')}</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
        {t('auth.createSub')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
        {[t('auth.perk1'), t('auth.perk2'), t('auth.perk3')].map((s) => (
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
          rules={[{ required: true, message: t('auth.choosePassword') }, { min: 8, message: t('auth.passwordMin') }]}
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
          {t('auth.createAccount')}
        </Button>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5 }} className="muted">
        {t('auth.alreadyMember')} <Link to="/login" style={{ color: 'var(--gold)' }}>{t('common.signIn')}</Link>
      </div>
    </AuthShell>
  );
}
