import { useCallback, useEffect, useState } from 'react';
import { App, Button, Col, Input, Modal, Row, Select } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi, membersApi } from '../../api';
import { AuthedImage, AuthedVideo } from '../../components/AuthedFile';
import { Blank, GridSkeleton, PageHeader } from '../../components/ui';
import { useT } from '../../i18n/useT';

export default function MediaQueue() {
  const t = useT();
  const { message, modal } = App.useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.recentMedia({ size: 48 });
      setItems(res.items);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    load();
  }, [load]);

  const restore = (m) => {
    modal.confirm({
      title: t('adminQueue.publishQ'),
      okText: t('common.open'),
      content: <div style={{ marginTop: 8, fontSize: 13.5 }}>It becomes visible on their profile again.</div>,
      onOk: async () => {
        setWorking(m.id);
        try {
          await adminApi.restoreMedia(m.id);
          message.success(t('adminQueue.approved'));
          load();
        } catch (e) {
          message.error(e.message);
        } finally {
          setWorking(null);
        }
      },
    });
  };

  const takeDown = async () => {
    if (!reason) {
      message.warning(t('adminQueue.pickMediaReason'));
      return;
    }
    setWorking(rejecting.id);
    try {
      await adminApi.takeDownMedia(rejecting.id, reason);
      message.success(t('adminQueue.rejected'));
      setRejecting(null);
      setReason(undefined);
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setWorking(null);
    }
  };

  return (
    <>
      <PageHeader
        title={t('admin.mediaTitle')}
        subtitle={t('adminQueue.mediaSub')}
        extra={<Button onClick={load} loading={loading}>{t('common.refresh')}</Button>}
      />

      {loading ? (
        <GridSkeleton count={8} ratio="1 / 1" />
      ) : items.length === 0 ? (
        <div className="glass" style={{ padding: 20 }}>
          <Blank title={t('adminQueue.nothingPending')} description={t('adminQueue.mediaClear')} />
        </div>
      ) : (
        <Row gutter={[18, 18]}>
          {items.map((m) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={m.id}>
              <div className="glass" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
                <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#0e0d13' }}>
                  {m.type === 'VIDEO' ? (
                    <AuthedVideo
                      path={membersApi.filePath(m.id)}
                      mimeType={m.contentType}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <AuthedImage
                      path={membersApi.filePath(m.id)}
                      mimeType={m.contentType}
                      alt={m.caption ?? 'submission'}
                      seed={m.id}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <span className="pill" style={{ position: 'absolute', top: 9, left: 9 }}>
                    {m.type === 'VIDEO' ? t('media.clip') : t('media.photo')}
                  </span>
                  <span
                    className={`pill${m.tier === 'FREE' ? '' : ' pill-gold'}`}
                    style={{ position: 'absolute', top: 9, right: 9 }}
                  >
                    {m.tier === 'FREE' ? t('media.free') : t('media.exclusive')}
                  </span>
                </div>

                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 13, minHeight: 34 }}>
                    {m.caption || <span className="faint">{t('media.noCaption')}</span>}
                  </div>
                  <div className="faint" style={{ fontSize: 11.5, marginTop: 6 }}>
                    {dayjs(m.createdAt).fromNow()}
                    {m.sizeBytes ? ` · ${(m.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ''}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    {m.status === 'REJECTED' ? (
                      <Button
                        block
                        size="small"
                        icon={<CheckOutlined />}
                        loading={working === m.id}
                        onClick={() => restore(m)}
                      >
                        {t('common.open')}
                      </Button>
                    ) : (
                      <Button
                        block
                        size="small"
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => {
                          setRejecting(m);
                          setReason(undefined);
                        }}
                      >
                        {t('common.reject')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        open={!!rejecting}
        title={t('adminQueue.rejectPostTitle')}
        onCancel={() => setRejecting(null)}
        onOk={takeDown}
        okText={t('common.reject')}
        okButtonProps={{ danger: true, loading: working === rejecting?.id }}
        destroyOnHidden
      >
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          The member sees this reason on their own media page, so make it something they can act on.
        </p>
        <Select
          style={{ width: '100%' }}
          placeholder={t('adminQueue.reason')}
          value={reason}
          onChange={setReason}
          options={['r1','r2','r3','r4','r5','r6'].map((k) => ({ value: t(`adminQueue.${k}`), label: t(`adminQueue.${k}`) }))}
        />
        <Input.TextArea
          rows={2}
          placeholder={t('adminQueue.ownReason')}
          style={{ marginTop: 10 }}
          onChange={(e) => setReason(e.target.value || undefined)}
        />
      </Modal>
    </>
  );
}
