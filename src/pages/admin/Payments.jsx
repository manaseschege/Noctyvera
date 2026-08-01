import { useCallback, useEffect, useState } from 'react';
import { App, Button, Col, Form, Input, Modal, Popconfirm, Row, Select, Table, Tag } from 'antd';
import { CheckOutlined, CloseOutlined, GiftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi } from '../../api';
import { Blank, PageHeader, StatCard } from '../../components/ui';
import { formatDisplay } from '../../api/currency';
import { fromMinor } from '../../api/currency';
import { useI18n } from '../../i18n/useT';

/**
 * Manual settlement desk.
 *
 * Payments that come in out of band (mobile money confirmations, bank
 * transfers) land here as PENDING and a human marks them received or
 * failed. Grants comp access without a payment at all.
 */
export default function Payments() {
  const { t, lang } = useI18n();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);
  const [granting, setGranting] = useState(false);
  const [grantBusy, setGrantBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.pendingPurchases({ size: 50 });
      setRows(res.items);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    load();
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (id, fn, label) => {
    setWorking(id);
    try {
      await fn(id);
      message.success(label);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      message.error(e.message);
    } finally {
      setWorking(null);
    }
  };

  const submitGrant = async (v) => {
    setGrantBusy(true);
    try {
      await adminApi.grant({
        viewerId: v.viewerId.trim(),
        targetId: v.targetId?.trim() || undefined,
        duration: v.duration,
      });
      message.success(t('adminQueue.granted'));
      setGranting(false);
      form.resetFields();
    } catch (e) {
      message.error(e.message);
    } finally {
      setGrantBusy(false);
    }
  };

  const currency = rows[0]?.currency;
  const total = rows.reduce((s, r) => s + fromMinor(r.amountMinor, currency), 0);

  return (
    <>
      <PageHeader
        title={t('admin.paymentsTitle')}
        subtitle={t('adminQueue.paymentsSub')}
        extra={
          <>
            <Button onClick={load} loading={loading}>{t('common.refresh')}</Button>
            <Button type="primary" icon={<GiftOutlined />} onClick={() => setGranting(true)}>
              {t('adminQueue.grantAccess')}
            </Button>
          </>
        }
      />

      <Row gutter={[18, 18]} style={{ marginBottom: 22 }}>
        <Col xs={12} md={8}><StatCard label={t('adminQueue.pendingCount')} value={rows.length} accent={rows.length ? 'var(--gold-bright)' : undefined} /></Col>
        <Col xs={12} md={8}>
          <StatCard label={t('adminQueue.valueHeld')} value={formatDisplay(total, currency, lang)} />
        </Col>
        <Col xs={24} md={8}>
          <StatCard label={t('adminQueue.oldest')} value={rows.length ? dayjs(rows[rows.length - 1].createdAt).fromNow() : '—'} />
        </Col>
      </Row>

      <div className="glass" style={{ padding: 20 }}>
        {!loading && rows.length === 0 ? (
          <Blank title={t('adminQueue.nothingPending')} description={t('adminQueue.allSettled')} />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            pagination={{ pageSize: 12, hideOnSinglePage: true }}
            scroll={{ x: 760 }}
            columns={[
              {
                title: t('adminQueue.purchase'),
                render: (_, r) => (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t(`enums.purchaseType.${r.type}`)}</div>
                    <div className="faint" style={{ fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>
                      {r.id}
                    </div>
                  </div>
                ),
              },
              {
                title: t('adminQueue.plan'),
                dataIndex: 'planCode',
                width: 120,
                responsive: ['md'],
                render: (p) => (p ? <Tag>{p}</Tag> : <span className="faint">—</span>),
              },
              {
                title: t('adminQueue.provider'),
                dataIndex: 'provider',
                width: 130,
                responsive: ['lg'],
                render: (p) => <span className="faint" style={{ fontSize: 12.5 }}>{p ?? '—'}</span>,
              },
              {
                title: t('adminQueue.created'),
                dataIndex: 'createdAt',
                width: 150,
                sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
                render: (d) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{dayjs(d).format('D MMM, HH:mm')}</span>,
              },
              {
                title: t('adminQueue.amount'),
                dataIndex: 'priceDisplay',
                width: 120,
                align: 'right',
                render: (v, r) => (
                  <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatDisplay(v, r.currency, lang)}
                  </span>
                ),
              },
              {
                title: '',
                width: 170,
                align: 'right',
                render: (_, r) => (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Popconfirm
                      title={t('adminQueue.settleQ')}
                      description={t('adminQueue.settleBody')}
                      okText={t('adminQueue.settle')}
                      onConfirm={() => act(r.id, adminApi.settlePurchase, t('adminQueue.settled'))}
                    >
                      <Button size="small" type="primary" icon={<CheckOutlined />} loading={working === r.id}>
                        {t('adminQueue.settle')}
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title={t('adminQueue.failQ')}
                      description={t('adminQueue.failBody')}
                      okText={t('common.reject')}
                      okButtonProps={{ danger: true }}
                      onConfirm={() => act(r.id, adminApi.failPurchase, t('adminQueue.failed'))}
                    >
                      <Button size="small" danger icon={<CloseOutlined />} loading={working === r.id} />
                    </Popconfirm>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal
        open={granting}
        title={t('adminQueue.grantTitle')}
        onCancel={() => setGranting(false)}
        onOk={() => form.submit()}
        okText={t('adminQueue.grant')}
        confirmLoading={grantBusy}
        destroyOnHidden
      >
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          {t('adminQueue.grantBody')}
        </p>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submitGrant} initialValues={{ duration: 'PT720H' }}>
          <Form.Item name="viewerId" label={t('adminQueue.viewerId')} rules={[{ required: true, message: t('common.required') }]}>
            <Input placeholder={t('adminQueue.viewerIdHint')} />
          </Form.Item>
          <Form.Item
            name="targetId"
            label={t('adminQueue.targetId')}
            extra={<span className="faint" style={{ fontSize: 12 }}>{t('adminQueue.targetIdHint')}</span>}
          >
            <Input placeholder={t('common.optional')} />
          </Form.Item>
          <Form.Item name="duration" label={t('adminQueue.duration')} rules={[{ required: true, message: t('common.required') }]}>
            <Select options={[['PT24H','d1'],['PT168H','d7'],['PT720H','d30'],['PT2160H','d90']].map(([v,k]) => ({ value: v, label: t(`adminQueue.${k}`) }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
