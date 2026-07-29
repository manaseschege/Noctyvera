import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { App, Button } from 'antd';
import { LockFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import { liveApi } from '../../api';
import SmartImage from '../../components/SmartImage';
import { Blank, GridSkeleton, PageHeader } from '../../components/ui';
import { useT } from '../../i18n/useT';

const elapsed = (iso) => {
  if (!iso) return '';
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function LiveDirectory() {
  const t = useT();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await liveApi.directory({ size: 24 });
      setItems(res.items);
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

  const live = items.filter((s) => s.status === 'LIVE');
  const scheduled = items.filter((s) => s.status === 'SCHEDULED');

  const Card = ({ s }) => (
    <Link to={`/live/${s.id}`} className="creator-card" style={{ display: 'block' }}>
      <div className="creator-card-media" style={{ aspectRatio: '16 / 10' }}>
        <SmartImage src={null} alt={s.title} seed={s.id} label={s.hostUsername} />
        <div className="creator-card-scrim" />
        <div className="creator-card-top">
          {s.status === 'LIVE' ? (
            <span className="pill pill-live">
              <span className="live-dot" /> {t('common.live').toUpperCase()} · {elapsed(s.startedAt)}
            </span>
          ) : (
            <span className="pill">{dayjs(s.scheduledFor).format('D MMM, HH:mm')}</span>
          )}
          {s.locked && (
            <span className="pill pill-gold">
              <LockFilled />
            </span>
          )}
        </div>
        <div className="creator-card-body">
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{s.title}</div>
          <div className="creator-card-meta">
            <span>@{s.hostUsername}</span>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 72 }}>
      <PageHeader
        title={t('liveRoom.title')}
        subtitle={t('liveRoom.subtitle')}
        extra={<Button onClick={() => navigate('/discover')}>{t('nav.browseMembers')}</Button>}
      />

      {loading ? (
        <GridSkeleton count={6} ratio="16 / 10" />
      ) : items.length === 0 ? (
        <Blank
          title={t('liveRoom.nobodyLive')}
          description={t('liveRoom.nobodyLiveBody')}
          action={<Button type="primary" onClick={() => navigate('/discover')}>{t('liveRoom.findMembers')}</Button>}
        />
      ) : (
        <>
          {live.length > 0 && (
            <>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                <span className="live-dot" style={{ display: 'inline-block', marginRight: 6 }} /> {t('liveRoom.onAir')}
              </div>
              <div className="browse-grid" style={{ marginBottom: 40 }}>
                {live.map((s) => (
                  <Card key={s.id} s={s} />
                ))}
              </div>
            </>
          )}

          {scheduled.length > 0 && (
            <>
              <div className="eyebrow" style={{ marginBottom: 14 }}>{t('liveRoom.comingUp')}</div>
              <div className="browse-grid">
                {scheduled.map((s) => (
                  <Card key={s.id} s={s} />
                ))}
              </div>
            </>
          )}

          {live.length === 0 && scheduled.length === 0 && (
            <Blank title={t('liveRoom.nothingScheduled')} description={t('liveRoom.checkLater')} />
          )}
        </>
      )}

      {items.length > 0 && (
        <div className="faint" style={{ marginTop: 26, fontSize: 12.5, textAlign: 'center' }}>
          {t('liveRoom.refreshes', { time: dayjs().format('HH:mm:ss') })}
        </div>
      )}
    </div>
  );
}
