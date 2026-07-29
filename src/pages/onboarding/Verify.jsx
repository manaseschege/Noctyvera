import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Col, DatePicker, Form, Input, Row, Select, Spin, Tag, Upload } from 'antd';
import { CheckCircleFilled, InboxOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { kycApi } from '../../api';
import { COUNTRY_CODES, DOC_TYPES, localiseOptions } from '../../api/config';
import { useT } from '../../i18n/useT';
import { homeFor, useAuth } from '../../store/auth';
import OnboardingShell from './OnboardingShell';

/** One document slot. The server tells us which kinds are still missing. */
function DocSlot({ kind, uploaded, onUploaded }) {
  const t = useT();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);

  const handle = async (file) => {
    const err = kycApi.validateDocument(file);
    if (err) {
      message.error(err);
      return Upload.LIST_IGNORE;
    }
    setBusy(true);
    try {
      const res = await kycApi.uploadDocument(kind, file);
      onUploaded(res);
      message.success(t('onboarding.uploaded', { kind: t(`enums.docKind.${kind}`) }));
    } catch (e) {
      message.error(e.message);
    } finally {
      setBusy(false);
    }
    return Upload.LIST_IGNORE;
  };

  if (uploaded) {
    return (
      <div
        className="glass"
        style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderColor: 'rgba(79,209,139,0.35)' }}
      >
        <CheckCircleFilled style={{ color: 'var(--success)', fontSize: 18 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t(`enums.docKind.${kind}`)}</div>
          <div className="faint" style={{ fontSize: 12 }}>{t('onboarding.received')}</div>
        </div>
        <Upload beforeUpload={handle} showUploadList={false} accept="image/*" disabled={busy}>
          <Button size="small" loading={busy}>{t('onboarding.replace')}</Button>
        </Upload>
      </div>
    );
  }

  return (
    <div className="dropzone">
      <Upload.Dragger beforeUpload={handle} showUploadList={false} accept="image/*" disabled={busy}>
        <p style={{ fontSize: 24, color: 'var(--gold)', margin: 0 }}>
          {busy ? <Spin /> : <InboxOutlined />}
        </p>
        <p style={{ margin: '8px 0 2px', fontSize: 13.5, fontWeight: 600 }}>{t(`enums.docKind.${kind}`)}</p>
        <p className="faint" style={{ margin: 0, fontSize: 12 }}>{t('onboarding.dropHint')}</p>
      </Upload.Dragger>
    </div>
  );
}

export default function Verify() {
  const t = useT();
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Must sit above any early return — hook order has to stay stable.
  const watchedDocType = Form.useWatch('documentType', form);

  const load = useCallback(async () => {
    try {
      const s = await kycApi.getSubmission();
      setSubmission(s);
      if (s) {
        form.setFieldsValue({
          documentType: s.documentType,
          fullName: s.fullName,
          countryOfIssue: s.countryOfIssue,
        });
      }
    } catch (e) {
      if (e.status !== 404) message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [form, message]);

  useEffect(() => {
    load();
  }, [load]);

  const saveDetails = async (v) => {
    setError(null);
    setSavingDetails(true);
    try {
      const s = await kycApi.saveSubmission({
        documentType: v.documentType,
        fullName: v.fullName,
        dateOfBirth: dayjs(v.dateOfBirth).format('YYYY-MM-DD'),
        countryOfIssue: v.countryOfIssue,
        documentNumber: v.documentNumber,
      });
      setSubmission(s);
      message.success(t('onboarding.detailsSaved'));
    } catch (e) {
      setError(e.fieldErrors ? Object.values(e.fieldErrors).join(' ') : e.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const send = async () => {
    setSubmitting(true);
    try {
      await kycApi.submit();
      const next = await refresh();
      message.success(t('onboarding.submitted'));
      navigate(homeFor(next, useAuth.getState().entitlements), { replace: true });
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <OnboardingShell>
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      </OnboardingShell>
    );
  }

  const detailsSaved = Boolean(submission?.id);
  const uploaded = new Set(submission?.uploadedDocuments ?? []);
  const missing = submission?.missingDocuments ?? [];
  const docType = watchedDocType ?? submission?.documentType;
  const expectedKinds = [
    ...(DOC_TYPES.find((d) => d.value === docType)?.kinds ?? []),
    'SELFIE',
  ];
  const slots = missing.length || uploaded.size ? [...new Set([...uploaded, ...missing])] : expectedKinds;

  return (
    <OnboardingShell>
      <h1 className="serif" style={{ fontSize: 32, margin: '0 0 8px' }}>{t('onboarding.verifyTitle')}</h1>
      <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
        One check, once. It's what keeps fake accounts off the platform — and it's required before
        you can post anything.
      </p>

      {submission?.status === 'REJECTED' && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 20 }}
          message={t('onboarding.verifyRejected')}
          description={submission.guidance || t('onboarding.verifyRejectedBody')}
        />
      )}

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} />}

      {/* ── Step 1: details ── */}
      <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>
          {t('onboarding.step1Doc')}
          {detailsSaved && <Tag color="green" style={{ marginLeft: 10 }}>{t('onboarding.saved')}</Tag>}
        </h3>

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={saveDetails}
          initialValues={{ documentType: 'NATIONAL_ID' }}
        >
          <Row gutter={14}>
            <Col xs={24} sm={12}>
              <Form.Item name="documentType" label={t('onboarding.docType')} rules={[{ required: true, message: t('common.required') }]}>
                <Select options={localiseOptions(DOC_TYPES, t)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="documentNumber" label={t('onboarding.docNumber')} rules={[{ required: true, message: t('common.required') }]}>
                <Input placeholder={submission?.documentNumberLast4 ? `•••• ${submission.documentNumberLast4}` : t('onboarding.docNumberPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="fullName" label={t('onboarding.legalName')} rules={[{ required: true, message: t('common.required') }]}>
            <Input placeholder={t('onboarding.legalNamePlaceholder')} />
          </Form.Item>

          <Row gutter={14}>
            <Col xs={24} sm={12}>
              <Form.Item name="dateOfBirth" label={t('onboarding.dob')} rules={[{ required: true, message: t('common.required') }]}>
                <DatePicker style={{ width: '100%' }} placeholder="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="countryOfIssue" label={t('onboarding.countryOfIssue')} rules={[{ required: true, message: t('common.required') }]}>
                <Select
                  showSearch
                  placeholder={t('common.search')}
                  optionFilterProp="label"
                  options={COUNTRY_CODES}
                />
              </Form.Item>
            </Col>
          </Row>

          <Button htmlType="submit" loading={savingDetails} type={detailsSaved ? 'default' : 'primary'}>
            {detailsSaved ? t('onboarding.updateDetails') : t('onboarding.saveDetails')}
          </Button>
        </Form>
      </div>

      {/* ── Step 2: documents ── */}
      <div className="glass" style={{ padding: 24, marginBottom: 20, opacity: detailsSaved ? 1 : 0.5, pointerEvents: detailsSaved ? 'auto' : 'none' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>{t('onboarding.step2Docs')}</h3>
        <p className="faint" style={{ fontSize: 12.5, marginBottom: 18 }}>
          {t('onboarding.docsPrivate')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {slots.map((kind) => (
            <DocSlot key={kind} kind={kind} uploaded={uploaded.has(kind)} onUploaded={setSubmission} />
          ))}
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
        message={t('onboarding.freeCheck')}
        description={t('onboarding.freeCheckBody')}
        style={{ marginBottom: 20 }}
      />

      <Button
        type="primary"
        size="large"
        block
        loading={submitting}
        disabled={!submission?.readyToSubmit}
        onClick={send}
      >
        {submission?.readyToSubmit ? t('onboarding.submitReview') : t('onboarding.addDocs')}
      </Button>
    </OnboardingShell>
  );
}
