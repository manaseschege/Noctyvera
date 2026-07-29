import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Col, DatePicker, Form, Input, Row, Select, Switch, Tag, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authApi } from '../../api';
import { GENDERS, VIBES, localiseOptions } from '../../api/config';
import { useT } from '../../i18n/useT';
import { homeFor, useAuth } from '../../store/auth';
import OnboardingShell from './OnboardingShell';
import { BRAND } from '../../brand';

export default function CreateProfile() {
  const t = useT();
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { user, refresh, patchUser } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [username, setUsername] = useState(user?.username ?? '');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Pre-fill if they've been here before and are editing.
    authApi
      .getProfile()
      .then((p) => {
        if (!p) return;
        form.setFieldsValue({
          displayName: p.displayName,
          bio: p.bio,
          dateOfBirth: p.dateOfBirth ? dayjs(p.dateOfBirth) : undefined,
          gender: p.gender,
          city: p.city,
          country: p.country,
          vibe: p.vibe,
          discoverable: p.discoverable ?? true,
        });
      })
      .catch(() => {
        /* no profile yet — expected on the first pass */
      });
  }, [form]);

  const reroll = async () => {
    setRerolling(true);
    try {
      const res = await authApi.rerollUsername();
      setUsername(res.username);
      patchUser({ username: res.username });
      message.success(t('onboarding.nowHandle', { username: res.username }));
    } catch (e) {
      message.error(e.message);
    } finally {
      setRerolling(false);
    }
  };

  const submit = async (v) => {
    setError(null);
    const age = dayjs().diff(v.dateOfBirth, 'year');
    if (age < 18) {
      setError(t('onboarding.tooYoung', { brand: BRAND.name }));
      return;
    }

    setSaving(true);
    try {
      await authApi.saveProfile({
        displayName: v.displayName,
        bio: v.bio,
        dateOfBirth: dayjs(v.dateOfBirth).format('YYYY-MM-DD'),
        gender: v.gender,
        city: v.city,
        country: v.country,
        vibe: v.vibe,
        discoverable: v.discoverable ?? true,
      });
      const next = await refresh();
      message.success(t('onboarding.profileSaved'));
      navigate(homeFor(next, useAuth.getState().entitlements), { replace: true });
    } catch (e) {
      setError(e.fieldErrors ? Object.values(e.fieldErrors).join(' ') : e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell>
      <h1 className="serif" style={{ fontSize: 32, margin: '0 0 8px' }}>{t('onboarding.profileTitle')}</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
        {t('onboarding.profileSub')}
      </p>

      <div
        className="glass"
        style={{ padding: 16, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{t('onboarding.yourHandle')}</div>
          <Tag color="gold" style={{ fontSize: 15, padding: '4px 12px' }}>@{username}</Tag>
        </div>
        <Tooltip title={t('onboarding.rerollHint')}>
          <Button icon={<ReloadOutlined />} loading={rerolling} onClick={reroll}>
            {t('onboarding.reroll')}
          </Button>
        </Tooltip>
      </div>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} />}

      <Form form={form} layout="vertical" requiredMark={false} size="large" onFinish={submit} initialValues={{ discoverable: true }}>
        <Form.Item name="displayName" label={t('onboarding.displayName')}>
          <Input placeholder={t('onboarding.displayNamePlaceholder')} maxLength={40} />
        </Form.Item>

        <Form.Item name="bio" label={t('onboarding.bio')}>
          <Input.TextArea rows={4} maxLength={400} showCount placeholder={t('onboarding.bioPlaceholder')} />
        </Form.Item>

        <Row gutter={14}>
          <Col xs={24} sm={12}>
            <Form.Item name="dateOfBirth" label={t('onboarding.dob')} rules={[{ required: true, message: t('common.required') }]}>
              <DatePicker style={{ width: '100%' }} placeholder="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="gender" label={t('onboarding.gender')} rules={[{ required: true, message: t('common.required') }]}>
              <Select options={localiseOptions(GENDERS, t)} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col xs={24} sm={12}>
            <Form.Item name="city" label={t('onboarding.city')}>
              <Input placeholder="Nairobi" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="country" label={t('onboarding.country')}>
              <Input placeholder="Kenya" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="vibe" label={t('onboarding.vibe')}>
          <Select placeholder={t('onboarding.vibePlaceholder')} options={localiseOptions(VIBES, t)} allowClear />
        </Form.Item>

        <Form.Item
          name="discoverable"
          label={t('onboarding.discoverable')}
          valuePropName="checked"
          extra={<span className="faint" style={{ fontSize: 12 }}>{t('onboarding.discoverableHint')}</span>}
        >
          <Switch />
        </Form.Item>

        <Button type="primary" htmlType="submit" size="large" block loading={saving} style={{ marginTop: 8 }}>
          {t('onboarding.saveContinue')}
        </Button>
      </Form>
    </OnboardingShell>
  );
}
