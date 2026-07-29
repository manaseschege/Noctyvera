import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Col, DatePicker, Form, Input, Popconfirm, Row, Table, Tag } from 'antd';
import { PlayCircleOutlined, StopOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { liveApi } from '../../api';
import { PageHeader, StatCard } from '../../components/ui';
import { useT } from '../../i18n/useT';

const STATUS_COLOR = { LIVE: 'red', SCHEDULED: 'gold', ENDED: 'default', CANCELLED: 'default' };

export default function MyLive() {
  const t = useT();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await liveApi.mine();
      setSessions(Array.isArray(res) ? res : res?.content ?? []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const create = async (v) => {
    setCreating(true);
    try {
      await liveApi.create({
        title: v.title,
        playbackUrl: v.playbackUrl || undefined,
        scheduledFor: v.scheduledFor ? dayjs(v.scheduledFor).toISOString() : undefined,
      });
      form.resetFields();
      message.success(t('liveRoom.created'));
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const run = async (fn, id, label) => {
    setActing(id);
    try {
      await fn(id);
      message.success(label);
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setActing(null);
    }
  };

  const liveNow = sessions.find((s) => s.status === 'LIVE');

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 72 }}>
      <PageHeader
        title={t('liveRoom.myRooms')}
        subtitle={t('liveRoom.myRoomsSub')}
      />

      <Row gutter={[18, 18]} style={{ marginBottom: 22 }}>
        <Col xs={8}><StatCard label={t('liveRoom.status')} value={liveNow ? t('liveRoom.onAir') : t('liveRoom.offAir')} accent={liveNow ? 'var(--live)' : undefined} /></Col>
        <Col xs={8}><StatCard label={t('liveRoom.scheduled')} value={sessions.filter((s) => s.status === 'SCHEDULED').length} /></Col>
        <Col xs={8}><StatCard label={t('liveRoom.past')} value={sessions.filter((s) => s.status === 'ENDED').length} /></Col>
      </Row>

      {liveNow && (
        <Alert
          type="error"
          showIcon
          icon={<span className="live-dot" style={{ display: 'inline-block', marginTop: 6 }} />}
          style={{ marginBottom: 22 }}
          message={t('studio.youAreLive', { title: liveNow.title })}
          description={t('liveRoom.liveWatchers')}
          action={
            <Popconfirm title={t('liveRoom.endConfirm')} okText={t('liveRoom.endIt')} okButtonProps={{ danger: true }} onConfirm={() => run(liveApi.end, liveNow.id, t('liveRoom.sessionEnded'))}>
              <Button danger icon={<StopOutlined />} loading={acting === liveNow.id}>{t('liveRoom.endIt')}</Button>
            </Popconfirm>
          }
        />
      )}

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={10}>
          <div className="glass" style={{ padding: 24 }}>
            <VideoCameraAddOutlined style={{ fontSize: 28, color: 'var(--gold)' }} />
            <h3 className="serif" style={{ fontSize: 22, margin: '12px 0 6px' }}>{t('liveRoom.newSession')}</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              Create it now, start it when you're ready. Leave the time blank to go on air immediately.
            </p>

            <Form form={form} layout="vertical" requiredMark={false} onFinish={create}>
              <Form.Item name="title" label={t('liveRoom.sessionTitle')} rules={[{ required: true, message: t('common.required') }]}>
                <Input placeholder={t('liveRoom.sessionTitlePlaceholder')} maxLength={70} showCount />
              </Form.Item>
              <Form.Item name="scheduledFor" label={t('liveRoom.scheduledFor')}>
                <DatePicker showTime style={{ width: '100%' }} placeholder={t('liveRoom.now')} />
              </Form.Item>
              <Form.Item
                name="playbackUrl"
                label={t('liveRoom.playbackUrl')}
                extra={<span className="faint" style={{ fontSize: 12 }}>{t('liveRoom.playbackHint')}</span>}
              >
                <Input placeholder="https://…" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={creating}>
                {t('liveRoom.createSession')}
              </Button>
            </Form>
          </div>
        </Col>

        <Col xs={24} lg={14}>
          <div className="glass" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>{t('liveRoom.yourSessions')}</h3>
            <Table
              rowKey="id"
              size="middle"
              loading={loading}
              dataSource={sessions}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              scroll={{ x: 560 }}
              columns={[
                {
                  title: t('liveRoom.session'),
                  dataIndex: 'title',
                  render: (title, r) => (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</div>
                      <div className="faint" style={{ fontSize: 11.5 }}>
                        {r.scheduledFor ? dayjs(r.scheduledFor).format('D MMM, HH:mm') : t('liveRoom.unscheduled')}
                      </div>
                    </div>
                  ),
                },
                {
                  title: t('liveRoom.status'),
                  dataIndex: 'status',
                  width: 120,
                  render: (s) => <Tag color={STATUS_COLOR[s]}>{t(`enums.sessionStatus.${s}`)}</Tag>,
                },
                {
                  title: '',
                  width: 130,
                  align: 'right',
                  render: (_, r) =>
                    r.status === 'SCHEDULED' ? (
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        loading={acting === r.id}
                        onClick={() => run(liveApi.start, r.id, t('liveRoom.youAreLive'))}
                      >
                        {t('liveRoom.goLive')}
                      </Button>
                    ) : r.status === 'LIVE' ? (
                      <Popconfirm title={t('liveRoom.endConfirm')} okText={t('liveRoom.endIt')} okButtonProps={{ danger: true }} onConfirm={() => run(liveApi.end, r.id, t('liveRoom.sessionEnded'))}>
                        <Button size="small" danger icon={<StopOutlined />} loading={acting === r.id}>
                          {t('liveRoom.endIt')}
                        </Button>
                      </Popconfirm>
                    ) : null,
                },
              ]}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
