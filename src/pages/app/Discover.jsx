import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Button, Input, Space, Switch, Tooltip } from 'antd';
import { AppstoreOutlined, SearchOutlined, TableOutlined } from '@ant-design/icons';
import { membersApi } from '../../api';
import { useAuth } from '../../store/auth';
import { useT } from '../../i18n/useT';
import MemberCard from '../../components/MemberCard';
import { AccessGate, Blank, GridSkeleton, LoadMore, PageHeader } from '../../components/ui';

const PAGE_SIZE = 24;

export default function Discover() {
  const t = useT();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [gate, setGate] = useState(null);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [dense, setDense] = useState(false);
  const [liveOnly, setLiveOnly] = useState(false);

  const city = params.get('city') ?? '';

  const load = useCallback(
    async (nextPage) => {
      if (nextPage === 0) setLoading(true);
      else setMore(true);
      try {
        const res = await membersApi.list({ city: city || undefined, page: nextPage, size: PAGE_SIZE });
        setItems((prev) => (nextPage === 0 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setLast(res.last);
        setPage(res.page);
        setGate(null);
      } catch (e) {
        // 401 = anonymous, 403 = unverified. Both are states to explain,
        // not errors to shout about.
        if (e.status === 401 || e.status === 403) setGate(e);
        else message.error(e.message);
      } finally {
        setLoading(false);
        setMore(false);
      }
    },
    [city, message],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const visible = liveOnly ? items.filter((m) => m.liveNow) : items;

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 72 }}>
      <PageHeader
        title={t('discover.title')}
        subtitle={gate ? t('discover.gatedSubtitle') : t('discover.subtitle', { count: total })}
      />

      {/* Sticks while the grid scrolls — the filters are useless if reaching
          them means scrolling back to the top of a hundred cards. */}
      <div className="filter-bar">
        <Input
          allowClear
          size="large"
          style={{ maxWidth: 300 }}
          prefix={<SearchOutlined style={{ color: 'var(--text-faint)' }} />}
          placeholder={t('discover.filterCity')}
          defaultValue={city}
          onPressEnter={(e) => setParams(e.target.value ? { city: e.target.value } : {}, { replace: true })}
          onChange={(e) => !e.target.value && city && setParams({}, { replace: true })}
        />

        <Space size={10} style={{ marginLeft: 'auto' }}>
          <span className="muted" style={{ fontSize: 13 }}>{t('discover.liveOnly')}</span>
          <Switch checked={liveOnly} onChange={setLiveOnly} />
          <Tooltip title={dense ? t('discover.largerCards') : t('discover.morePerRow')}>
            <Button type="text" icon={dense ? <AppstoreOutlined /> : <TableOutlined />} onClick={() => setDense((d) => !d)} />
          </Tooltip>
        </Space>
      </div>

      {loading ? (
        <GridSkeleton count={12} />
      ) : gate ? (
        <AccessGate
          error={gate}
          signedIn={!!user}
          onJoin={() => navigate('/join')}
          onVerify={() => navigate('/onboarding/verify')}
        />
      ) : visible.length === 0 ? (
        <Blank
          title={liveOnly ? t('discover.noneLive') : t('discover.noMembers')}
          description={liveOnly ? t('discover.noneLiveBody') : city ? t('discover.noneInCity', { city }) : t('discover.checkBack')}
          action={
            (city || liveOnly) && (
              <Button
                type="primary"
                onClick={() => {
                  setLiveOnly(false);
                  setParams({}, { replace: true });
                }}
              >
                {t('discover.clearFilters')}
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className={`browse-grid${dense ? ' dense' : ''}`} style={{ opacity: more ? 0.75 : 1, transition: 'opacity 0.2s' }}>
            {visible.map((m) => (
              <MemberCard key={m.userId} member={m} />
            ))}
          </div>
          <LoadMore hidden={last} loading={more} onClick={() => load(page + 1)} />
        </>
      )}
    </div>
  );
}
