import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Col, DatePicker, Form, Input, Row, Select, Skeleton, Switch, Tag, Tooltip } from 'antd';
import { LogoutOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authApi } from '../../api';
import { GENDERS, VERIFICATION, VIBES, localiseOptions } from '../../api/config';
import {
  STATUS_COLOR,
  VERIFICATION_COLOR,
  useAuth,
} from '../../store/auth';
import { PageHeader } from '../../components/ui';
import { useT } from '../../i18n/useT';

export default function MyAccount() {
  const t = useT();
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { user, refresh, patchUser } = useAuth();
  const navigate = useNavigate();

  const [, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  useEffect(() => {
    authApi
      .getProfile()
      .then((p) => {
        setProfile(p);
        form.setFieldsValue({
          displayName: p.displayName,
          bio: p.bio,
          dateOfBirth: p.dateOfBirth ? dayjs(p.dateOfBirth) : undefined,
          gender: p.gender,
          city: p.city,
          country: p.country,
          vibe: p.vibe,
          discoverable: p.discoverable,
        });
      })
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [form, message]);

  const save = async (v) => {
    setSaving(true);
    try {
      const updated = await authApi.saveProfile({
        displayName: v.displayName,
        bio: v.bio,
        dateOfBirth: dayjs(v.dateOfBirth).format('YYYY-MM-DD'),
        gender: v.gender,
        city: v.city,
        country: v.country,
        vibe: v.vibe,
        discoverable: v.discoverable,
      });
      setProfile(updated);
      await refresh();
      message.success(t('onboarding.profileSaved'));
    } catch (e) {
      message.error(e.fieldErrors ? Object.values(e.fieldErrors).join(' ') : e.message);
    } finally {
      setSaving(false);
    }
  };

  const reroll = async () => {
    setRerolling(true);
    try {
      const res = await authApi.rerollUsername();
      patchUser({ username: res.username });
      setProfile((p) => (p ? { ...p, username: res.username } : p));
      message.success(t('onboarding.nowHandle', { username: res.username }));
    } catch (e) {
      message.error(e.message);
    } finally {
      setRerolling(false);
    }
  };

  const signOutAll = async () => {
    setSigningOutAll(true);
    try {
      await authApi.logoutEverywhere();
      navigate('/login', { replace: true });
    } catch (e) {
      message.error(e.message);
    } finally {
      setSigningOutAll(false);
    }
  };

  if (loading) {
    return (
      <div className="shell" style={{ paddingTop: 40 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 72, maxWidth: 980 }}>
      <PageHeader title={t('account.title')} subtitle={t('account.subtitle')} />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={9}>
          <div className="glass" style={{ padding: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{t('onboarding.yourHandle')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Tag color="gold" style={{ fontSize: 15, padding: '4px 12px', marginInlineEnd: 0 }}>
                @{user?.username}
              </Tag>
              <Tooltip title={t('onboarding.rerollHint')}>
                <Button size="small" icon={<ReloadOutlined />} loading={rerolling} onClick={reroll}>
                  {t('onboarding.reroll')}
                </Button>
              </Tooltip>
            </div>

            <div style={{ marginTop: 22 }}>
              <div className="kv-row">
                <span className="k">{t('common.email')}</span>
                <span className="v">{user?.email}</span>
              </div>
              <div className="kv-row">
                <span className="k">{t('account.role')}</span>
                <span className="v">{t(`enums.role.${user?.role}`)}</span>
              </div>
              <div className="kv-row">
                <span className="k">{t('account.accountStatus')}</span>
                <span className="v">
                  <Tag color={STATUS_COLOR[user?.status]}>{user?.status}</Tag>
                </span>
              </div>
              <div className="kv-row">
                <span className="k">{t('account.identity')}</span>
                <span className="v">
                  <Tag color={VERIFICATION_COLOR[user?.verificationStatus]}>
                    {t(`enums.verification.${user?.verificationStatus}`)}
                  </Tag>
                </span>
              </div>
              <div className="kv-row">
                <span className="k">{t('account.memberSince')}</span>
                <span className="v">{dayjs(user?.createdAt).format('MMMM YYYY')}</span>
              </div>
            </div>

            {user?.verificationStatus !== VERIFICATION.APPROVED && (
              <Alert
                type="warning"
                showIcon
                icon={<SafetyCertificateOutlined />}
                style={{ marginTop: 18 }}
                message={t('account.cantPost')}
                description={t('account.cantPostBody')}
                action={
                  <Button size="small" onClick={() => navigate('/onboarding/verify')}>
                    {t('account.verify')}
                  </Button>
                }
              />
            )}

            <Button
              danger
              block
              icon={<LogoutOutlined />}
              loading={signingOutAll}
              onClick={signOutAll}
              style={{ marginTop: 18 }}
            >
              {t('account.signOutEverywhere')}
            </Button>
          </div>
        </Col>

        <Col xs={24} lg={15}>
          <div className="glass" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 18px' }}>{t('account.profile')}</h3>
            <Form form={form} layout="vertical" requiredMark={false} onFinish={save}>
              <Form.Item name="displayName" label={t('onboarding.displayName')}>
                <Input maxLength={40} />
              </Form.Item>

              <Form.Item name="bio" label={t('onboarding.bio')}>
                <Input.TextArea rows={4} maxLength={400} showCount />
              </Form.Item>

              <Row gutter={14}>
                <Col xs={24} sm={12}>
                  <Form.Item name="dateOfBirth" label={t('onboarding.dob')} rules={[{ required: true, message: t('common.required') }]}>
                    <DatePicker style={{ width: '100%' }} />
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
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="country" label={t('onboarding.country')}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="vibe" label={t('onboarding.vibe')}>
                <Select options={localiseOptions(VIBES, t)} allowClear />
              </Form.Item>

              <Form.Item
                name="discoverable"
                label={t('onboarding.discoverable')}
                valuePropName="checked"
                extra={<span className="faint" style={{ fontSize: 12 }}>{t('onboarding.discoverableHint')}</span>}
              >
                <Switch />
              </Form.Item>

              <Button type="primary" htmlType="submit" size="large" loading={saving}>
                {t('common.saveChanges')}
              </Button>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
}
