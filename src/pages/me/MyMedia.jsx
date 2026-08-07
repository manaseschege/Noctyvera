import { useCallback, useEffect, useState } from 'react';
import { App, Button, Col, Input, InputNumber, Modal, Popconfirm, Progress, Radio, Row, Segmented, Space, Tag, Tooltip, Upload } from 'antd';
import {
  CheckCircleFilled,
  GlobalOutlined,
  LockFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { mediaApi } from '../../api';
import { MEDIA_STATUS, MEDIA_TIER, UPLOAD_LIMITS } from '../../api/config';
import { AuthedImage, AuthedVideo } from '../../components/AuthedFile';
import { Blank, GridSkeleton, PageHeader, StatCard } from '../../components/ui';
import { currencyCode, formatDisplay } from '../../api/currency';
import { useI18n } from '../../i18n/useT';

const statusMeta = (t) => ({
  [MEDIA_STATUS.APPROVED]: { color: 'green', label: t('media.liveStatus'), icon: <CheckCircleFilled /> },
  [MEDIA_STATUS.PENDING_REVIEW]: { color: 'gold', label: t('media.inReview'), icon: <ClockCircleOutlined /> },
  [MEDIA_STATUS.REJECTED]: { color: 'red', label: t('media.rejected'), icon: <CloseCircleFilled /> },
});

export default function MyMedia() {
  const { t, lang } = useI18n();
  const { message } = App.useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('photo');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState('');
  const [tier, setTier] = useState(MEDIA_TIER.EXCLUSIVE);
  const [price, setPrice] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mediaApi.mine();
      setItems(Array.isArray(res) ? res : res?.content ?? []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (file) => {
    const err = mediaApi.validate(file, kind);
    if (err) {
      message.error(err);
      return Upload.LIST_IGNORE;
    }
    setUploading(true);
    setProgress(30);
    try {
      const fn = kind === 'video' ? mediaApi.uploadVideo : mediaApi.uploadPhoto;
      await fn(file, {
        caption: caption || undefined,
        tier,
        // A free item has nothing to charge for, so the price is not sent even
        // if one is still sitting in the box from a previous upload.
        priceMinor: tier === MEDIA_TIER.EXCLUSIVE && price != null ? price : undefined,
      });
      setProgress(100);
      setCaption('');
      message.success(t('media.uploadedPending'));
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
    return Upload.LIST_IGNORE;
  };

  const save = async () => {
    try {
      const patch = { caption: editing.caption };
      // Only sent when it changed and the item is actually paid. Sending it
      // unchanged would still be a write, and the server's floor/ceiling would
      // then reject an edit to the caption of an item priced before the bounds
      // were tightened.
      if (editing.tier === MEDIA_TIER.EXCLUSIVE && editing.unlockPriceMinor !== editing.priceMinor) {
        patch.unlockPriceMinor = editing.unlockPriceMinor;
      }
      await mediaApi.update(editing.id, patch);
      message.success(patch.unlockPriceMinor != null ? t('media.priceSaved') : t('media.captionUpdated'));
      setEditing(null);
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const flipTier = async (m) => {
    const next = m.tier === MEDIA_TIER.FREE ? MEDIA_TIER.EXCLUSIVE : MEDIA_TIER.FREE;
    try {
      await mediaApi.setTier(m.id, next);
      message.success(next === MEDIA_TIER.FREE ? t('media.nowFree') : t('media.nowExclusive'));
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const makePrimary = async (id) => {
    try {
      await mediaApi.setPrimary(id);
      message.success(t('media.mainSet'));
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const remove = async (id) => {
    try {
      await mediaApi.remove(id);
      message.success(t('media.deleted'));
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  const visible = items.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'PHOTO' || filter === 'VIDEO') return m.type === filter;
    if (filter === MEDIA_TIER.FREE || filter === MEDIA_TIER.EXCLUSIVE) return m.tier === filter;
    return m.status === filter;
  });

  const counts = {
    free: items.filter((m) => m.tier === MEDIA_TIER.FREE).length,
    exclusive: items.filter((m) => m.tier === MEDIA_TIER.EXCLUSIVE).length,
    rejected: items.filter((m) => m.status === MEDIA_STATUS.REJECTED).length,
  };

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 72 }}>
      <PageHeader
        title={t('media.title')}
        subtitle={t('media.subtitleTiers')}
      />

      <Row gutter={[18, 18]} style={{ marginBottom: 22 }}>
        <Col xs={12} md={6}><StatCard label={t('media.posted')} value={items.length} /></Col>
        <Col xs={12} md={6}><StatCard label={t('media.free')} value={counts.free} accent="var(--success)" /></Col>
        <Col xs={12} md={6}><StatCard label={t('media.exclusive')} value={counts.exclusive} accent={counts.exclusive ? 'var(--gold-bright)' : undefined} /></Col>
        <Col xs={12} md={6}><StatCard label={t('media.rejected')} value={counts.rejected} accent={counts.rejected ? 'var(--danger)' : undefined} /></Col>
      </Row>

      {/* ── Upload ── */}
      <div className="glass dropzone" style={{ padding: 22, marginBottom: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t('media.addNew')}</h3>
          <Segmented
            value={kind}
            onChange={setKind}
            options={[{ value: 'photo', label: t('media.photo') }, { value: 'video', label: t('media.video') }]}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{t('media.whoCanSee')}</div>
          <Radio.Group value={tier} onChange={(e) => setTier(e.target.value)} style={{ width: '100%' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {[
                { value: MEDIA_TIER.FREE, icon: <GlobalOutlined />, label: t('media.tierFree'), hint: t('media.tierFreeHint') },
                { value: MEDIA_TIER.EXCLUSIVE, icon: <LockFilled />, label: t('media.tierExclusive'), hint: t('media.tierExclusiveHint') },
              ].map((o) => (
                <Radio
                  key={o.value}
                  value={o.value}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid var(--line)',
                    borderRadius: 12,
                    margin: 0,
                    background: tier === o.value ? 'var(--gold-wash)' : 'transparent',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {o.icon} {o.label}
                  </span>
                  <span className="faint" style={{ display: 'block', fontSize: 12, marginTop: 3, whiteSpace: 'normal' }}>
                    {o.hint}
                  </span>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </div>

        {/* Only for paid items — a free one has nothing to price, and showing a
            disabled price box next to "everyone can see this" reads as a bug. */}
        {tier === MEDIA_TIER.EXCLUSIVE && (
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{t('media.yourPrice')}</div>
            <InputNumber
              size="large"
              style={{ width: '100%' }}
              min={0}
              step={500}
              value={price}
              onChange={setPrice}
              addonBefore={currencyCode()}
              placeholder={t('media.pricePlaceholder')}
            />
            <div className="faint" style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.55 }}>
              {t('media.priceHint')}
            </div>
          </div>
        )}

        <Input
          placeholder={t('media.caption')}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={140}
          showCount
          style={{ marginBottom: 12 }}
        />

        <Upload.Dragger
          beforeUpload={handleFile}
          showUploadList={false}
          accept={kind === 'video' ? 'video/*' : 'image/*'}
          disabled={uploading}
        >
          <p style={{ fontSize: 30, color: 'var(--gold)', margin: 0 }}><InboxOutlined /></p>
          <p style={{ fontSize: 14.5, margin: '10px 0 4px' }}>{t('media.dropHere', { kind: kind === 'video' ? t('media.video') : t('media.photo') })}</p>
          <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>
            {kind === 'video'
              ? t('media.videoLimits', { mb: UPLOAD_LIMITS.videoMb })
              : t('media.photoLimits', { mb: UPLOAD_LIMITS.photoMb })}
          </p>
          {uploading && <Progress percent={progress} size="small" showInfo={false} style={{ maxWidth: 260, margin: '14px auto 0' }} />}
        </Upload.Dragger>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'PHOTO', label: t('common.photos') },
            { value: 'VIDEO', label: t('common.clips') },
            { value: MEDIA_TIER.FREE, label: t('media.free') },
            { value: MEDIA_TIER.EXCLUSIVE, label: t('media.exclusive') },
            { value: MEDIA_STATUS.REJECTED, label: t('media.rejected') },
          ]}
        />
      </div>

      {loading ? (
        <GridSkeleton count={8} ratio="1 / 1" />
      ) : visible.length === 0 ? (
        <Blank title={t('common.nothingHere')} description={t('media.noneYet')} />
      ) : (
        <div className="browse-grid dense">
          {visible.map((m) => {
            const meta = statusMeta(t)[m.status] ?? {};
            return (
              <div key={m.id}>
                <div className="media-tile" style={{ aspectRatio: '1 / 1' }}>
                  {m.type === 'VIDEO' ? (
                    <AuthedVideo
                      path={mediaApi.filePath(m.id)}
                      mimeType={m.contentType}
                      controls={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <AuthedImage path={mediaApi.filePath(m.id)} mimeType={m.contentType} alt={m.caption ?? ''} seed={m.id} />
                  )}
                  <div className="media-tile-corner" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <Tag color={meta.color} icon={meta.icon} style={{ marginInlineEnd: 0 }}>
                      {meta.label}
                    </Tag>
                    <Tag
                      color={m.tier === MEDIA_TIER.FREE ? 'blue' : 'gold'}
                      icon={m.tier === MEDIA_TIER.FREE ? <GlobalOutlined /> : <LockFilled />}
                      style={{ marginInlineEnd: 0 }}
                    >
                      {m.tier === MEDIA_TIER.FREE ? t('media.free') : t('media.exclusive')}
                    </Tag>
                  </div>
                  {m.primary && (
                    <span className="pill pill-gold" style={{ position: 'absolute', top: 9, left: 9, zIndex: 2 }}>
                      <StarFilled /> {t('media.main')}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.caption || <span className="faint">{t('media.noCaption')}</span>}
                  </div>
                  <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>
                    {dayjs(m.createdAt).format('D MMM YYYY')}
                  </div>
                  {m.status === MEDIA_STATUS.REJECTED && m.rejectionReason && (
                    <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{m.rejectionReason}</div>
                  )}

                  <Space size={2} style={{ marginTop: 6 }}>
                    <Tooltip title={t('media.editCaption')}>
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing({ ...m })} />
                    </Tooltip>
                    <Tooltip title={m.tier === MEDIA_TIER.FREE ? t('media.makeExclusive') : t('media.makeFree')}>
                      <Button
                        type="text"
                        size="small"
                        icon={m.tier === MEDIA_TIER.FREE ? <LockFilled /> : <GlobalOutlined />}
                        onClick={() => flipTier(m)}
                      />
                    </Tooltip>
                    {m.type === 'PHOTO' && !m.primary && (
                      <Tooltip title={t('media.makeMain')}>
                        <Button type="text" size="small" icon={<StarOutlined />} onClick={() => makePrimary(m.id)} />
                      </Tooltip>
                    )}
                    <Popconfirm title={t('media.deleteConfirm')} okText={t('common.delete')} okButtonProps={{ danger: true }} onConfirm={() => remove(m.id)}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} title={t('media.editCaption')} onCancel={() => setEditing(null)} onOk={save} okText={t('common.save')} destroyOnHidden>
        <Input.TextArea
          rows={3}
          value={editing?.caption ?? ''}
          maxLength={140}
          showCount
          onChange={(e) => setEditing((s) => ({ ...s, caption: e.target.value }))}
          style={{ marginTop: 14 }}
        />

        {editing?.tier === MEDIA_TIER.EXCLUSIVE && (
          <div style={{ marginTop: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t('media.yourPrice')}</div>
            <InputNumber
              size="large"
              style={{ width: '100%' }}
              min={0}
              step={500}
              value={editing?.unlockPriceMinor ?? editing?.priceMinor ?? null}
              onChange={(v) => setEditing((s) => ({ ...s, unlockPriceMinor: v }))}
              addonBefore={currencyCode(editing?.currency)}
              placeholder={t('media.pricePlaceholder')}
            />
            <div className="faint" style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.55 }}>
              {editing?.priceDisplay
                ? t('media.currentlyPriced', {
                    price: formatDisplay(editing.priceDisplay, editing.currency, lang),
                  })
                : t('media.priceHint')}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
