import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Col,
  Descriptions,
  Drawer,
  Input,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, IdcardOutlined, WarningFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi } from '../../api';
import { REJECTION_REASONS } from '../../api/config';
import { useAuth } from '../../store/auth';
import { AuthedImage } from '../../components/AuthedFile';
import { Blank, PageHeader } from '../../components/ui';
import { useT } from '../../i18n/useT';


const STATUS_TAG = {
  PENDING_REVIEW: { color: 'gold', label: 'Pending' },
  APPROVED: { color: 'green', label: 'Approved' },
  REJECTED: { color: 'red', label: 'Rejected' },
  DRAFT: { color: 'default', label: 'Draft' },
};

export default function KycQueue() {
  const t = useT();
  const { user } = useAuth();
  const { message, modal } = App.useApp();

  const [scope, setScope] = useState('queue');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [working, setWorking] = useState(false);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = scope === 'queue' ? await adminApi.kycQueue({ size: 50 }) : await adminApi.kycAll({ size: 100 });
      setRows(res.items);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [scope, message]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (row) => {
    setNotes('');
    setReason(undefined);
    try {
      const full = await adminApi.kycDetail(row.submissionId);
      setOpen(full);
    } catch (e) {
      // The list row already has most of it — fall back rather than blocking.
      setOpen(row);
      if (e.status !== 404) message.error(e.message);
    }
  };

  const decide = (approve) => {
    if (!approve && !reason) {
      message.warning(t('adminQueue.pickReason'));
      return;
    }
    modal.confirm({
      title: approve ? `Approve ${open.statedFullName || open.email}?` : `Reject ${open.statedFullName || open.email}?`,
      okText: approve ? t('common.approve') : t('common.reject'),
      okButtonProps: { danger: !approve },
      content: (
        <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.7 }}>
          {approve
            ? 'They will be able to post photos and open live rooms immediately.'
            : `Reason: ${REJECTION_REASONS.find((r) => r.value === reason)?.label}. They can correct it and submit again.`}
        </div>
      ),
      onOk: async () => {
        setWorking(true);
        try {
          await adminApi.reviewKyc(open.submissionId, {
            approve,
            rejectionReason: approve ? undefined : reason,
            reviewerNotes: notes || undefined,
          });
          message.success(approve ? t('adminQueue.approved') : t('adminQueue.rejected'));
          setOpen(null);
          load();
        } catch (e) {
          message.error(e.message);
        } finally {
          setWorking(false);
        }
      },
    });
  };

  const columns = [
    {
      title: t('adminQueue.applicant'),
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.statedFullName || '—'}</div>
          <div className="faint" style={{ fontSize: 11.5 }}>{r.email}</div>
        </div>
      ),
    },
    {
      title: t('adminQueue.document'),
      dataIndex: 'documentType',
      width: 170,
      responsive: ['md'],
      render: (d, r) => (
        <div>
          <div style={{ fontSize: 13 }}>{t(`enums.docType.${d}`)}</div>
          <div className="faint" style={{ fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>
            •••• {r.documentNumberLast4 ?? '—'}
          </div>
        </div>
      ),
    },
    { title: t('adminQueue.country'), dataIndex: 'countryOfIssue', width: 130, responsive: ['lg'] },
    {
      title: t('adminQueue.flags'),
      width: 120,
      render: (_, r) =>
        r.possibleDuplicate ? (
          <Tag color="red" icon={<WarningFilled />}>{t('adminQueue.duplicate')}</Tag>
        ) : (
          <span className="faint" style={{ fontSize: 12 }}>{t('adminQueue.clear')}</span>
        ),
    },
    {
      title: t('adminQueue.submitted'),
      dataIndex: 'submittedAt',
      width: 130,
      sorter: (a, b) => new Date(a.submittedAt) - new Date(b.submittedAt),
      render: (d) => <span style={{ fontSize: 13 }}>{d ? dayjs(d).fromNow() : '—'}</span>,
    },
    {
      title: t('adminQueue.status'),
      dataIndex: 'status',
      width: 120,
      render: (s) => <Tag color={STATUS_TAG[s]?.color}>{STATUS_TAG[s]?.label ?? s}</Tag>,
    },
    {
      title: '',
      width: 110,
      align: 'right',
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>
          {t('adminQueue.review')}
        </Button>
      ),
    },
  ];

  const ages = open
    ? {
        stated: open.statedDateOfBirth ? dayjs().diff(open.statedDateOfBirth, 'year') : null,
        profile: open.profileDateOfBirth ? dayjs().diff(open.profileDateOfBirth, 'year') : null,
      }
    : {};
  const dobMismatch =
    open?.statedDateOfBirth && open?.profileDateOfBirth && open.statedDateOfBirth !== open.profileDateOfBirth;
  const underage = ages.stated != null && ages.stated < 18;

  return (
    <>
      <PageHeader
        title={t('admin.kycTitle')}
        subtitle={t('adminQueue.kycSub')}
        extra={
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { value: 'queue', label: t('adminQueue.pending') },
              { value: 'all', label: t('adminQueue.all') },
            ]}
          />
        }
      />

      <div className="glass" style={{ padding: 20 }}>
        {!loading && rows.length === 0 ? (
          <Blank title={t('admin.queueClear')} description={t('admin.nothingWaiting')} />
        ) : (
          <Table
            rowKey="submissionId"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 12, hideOnSinglePage: true }}
            scroll={{ x: 780 }}
          />
        )}
      </div>

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        width={720}
        title={
          <Space>
            <IdcardOutlined style={{ color: 'var(--gold)' }} />
            {open?.statedFullName || open?.email}
            {open && <Tag color={STATUS_TAG[open.status]?.color}>{STATUS_TAG[open.status]?.label}</Tag>}
          </Space>
        }
        footer={
          open?.status === 'PENDING_REVIEW' ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <Button danger icon={<CloseOutlined />} loading={working} onClick={() => decide(false)}>
                Reject
              </Button>
              <Button type="primary" icon={<CheckOutlined />} loading={working} onClick={() => decide(true)} style={{ marginLeft: 'auto' }}>
                Approve
              </Button>
            </div>
          ) : null
        }
      >
        {open && (
          <>
            {underage && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message={t('adminQueue.underageTitle')}
                description={t('adminQueue.underageBody')}
              />
            )}
            {open.possibleDuplicate && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={t('adminQueue.dupTitle')}
                description={t('adminQueue.dupBody')}
              />
            )}
            {dobMismatch && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={t('adminQueue.dobTitle')}
                description={`Document says ${dayjs(open.statedDateOfBirth).format('D MMM YYYY')}, profile says ${dayjs(open.profileDateOfBirth).format('D MMM YYYY')}.`}
              />
            )}

            <h4 style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 10px' }}>{t('adminQueue.documents')}</h4>
            {open.documents?.length ? (
              <Row gutter={[12, 12]} style={{ marginBottom: 22 }}>
                {open.documents.map((d) => (
                  <Col xs={24} sm={12} key={d.documentId}>
                    <div className="doc-frame">
                      {d.purged ? (
                        <div style={{ padding: 40, textAlign: 'center' }} className="faint">
                          {t('adminQueue.purged')}
                        </div>
                      ) : (
                        <AuthedImage
                          path={adminApi.kycDocumentPath(d.documentId)}
                          alt={t(`enums.docKind.${d.kind}`)}
                          seed={d.documentId}
                          style={{ width: '100%', display: 'block' }}
                        />
                      )}
                    </div>
                    <div className="faint" style={{ fontSize: 11.5, marginTop: 6, textAlign: 'center' }}>
                      {t(`enums.docKind.${d.kind}`)}
                      {d.sizeBytes ? ` · ${(d.sizeBytes / 1024).toFixed(0)} KB` : ''}
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <Alert type="info" showIcon message={t('adminQueue.noDocs')} style={{ marginBottom: 22 }} />
            )}

            <Descriptions
              bordered
              size="small"
              column={1}
              styles={{ label: { width: 190, color: 'var(--text-muted)' } }}
              items={[
                { key: 'name', label: t('adminQueue.statedName'), children: open.statedFullName ?? '—' },
                { key: 'email', label: t('common.email'), children: open.email },
                {
                  key: 'dob',
                  label: t('adminQueue.dob'),
                  children: open.statedDateOfBirth
                    ? `${dayjs(open.statedDateOfBirth).format('D MMM YYYY')} (${ages.stated})`
                    : '—',
                },
                { key: 'doc', label: t('adminQueue.document'), children: `${t(`enums.docType.${open.documentType}`)} · •••• ${open.documentNumberLast4 ?? ''}` },
                { key: 'country', label: t('adminQueue.countryIssue'), children: open.countryOfIssue ?? '—' },
                { key: 'sub', label: t('adminQueue.submitted'), children: open.submittedAt ? dayjs(open.submittedAt).format('D MMM YYYY, HH:mm') : '—' },
                ...(open.reviewedAt
                  ? [
                      {
                        key: 'rev',
                        label: t('adminQueue.reviewed'),
                        children: `${dayjs(open.reviewedAt).format('D MMM YYYY')} by ${open.reviewedByEmail ?? '—'}${open.reviewerNotes ? ` — ${open.reviewerNotes}` : ''}`,
                      },
                    ]
                  : []),
                ...(open.rejectionReason
                  ? [{ key: 'rr', label: t('adminQueue.rejectionReason'), children: <Tag color="red">{open.rejectionReason}</Tag> }]
                  : []),
              ]}
              style={{ marginBottom: 20 }}
            />

            {open.status === 'PENDING_REVIEW' && (
              <>
                <h4 style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 10px' }}>{t('adminQueue.decision')}</h4>
                <Select
                  placeholder={t('adminQueue.reasonRequired')}
                  style={{ width: '100%', marginBottom: 10 }}
                  value={reason}
                  onChange={setReason}
                  allowClear
                  options={REJECTION_REASONS.map((r) => ({ value: r.value, label: t(r.labelKey) }))}
                />
                <Input.TextArea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('adminQueue.notes')}
                />
                <div className="faint" style={{ fontSize: 11.5, marginTop: 8 }}>
                  {t('adminQueue.reviewingAs', { email: user?.email ?? '' })}
                </div>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
