import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Button, Input, Select, Space, Switch, Tooltip } from 'antd';
import { AppstoreOutlined, SearchOutlined, TableOutlined } from '@ant-design/icons';
import { membersApi } from '../../api';
import { useAuth } from '../../store/auth';
import { useT } from '../../i18n/useT';
import MemberCard from '../../components/MemberCard';
import { AccessGate, Blank, GridSkeleton, LoadMore, PageHeader } from '../../components/ui';

const PAGE_SIZE = 24;

/**
 * Age filtering as a handful of presets rather than a two-handled slider.
 *
 * A range slider is fiddly on a phone — two small targets that have to be
 * dragged past each other — and nobody browsing actually wants 27-33. One tap,
 * one list. `min`/`max` are sent as-is; an absent bound means open at that end.
 */
const AGE_RANGES = [
  { value: '', min: null, max: null, labelKey: 'discover.anyAge' },
  { value: '18-24', min: 18, max: 24, labelKey: 'discover.age18' },
  { value: '25-34', min: 25, max: 34, labelKey: 'discover.age25' },
  { value: '35-44', min: 35, max: 44, labelKey: 'discover.age35' },
  { value: '45-', min: 45, max: null, labelKey: 'discover.age45' },
];

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
  const age = params.get('age') ?? '';
  const range = AGE_RANGES.find((r) => r.value === age) ?? AGE_RANGES[0];

  /**
   * Change one filter without dropping the others.
   *
   * The filters live in the URL so a search stays shareable and survives a
   * reload, but that only works if setting a city does not silently wipe the
   * age — which is what replacing the whole param object does.
   */
  const patchParams = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => {
        if (v) next.set(k, v);
        else next.delete(k);
      });
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const load = useCallback(
    async (nextPage) => {
      if (nextPage === 0) setLoading(true);
      else setMore(true);
      try {
        const res = await membersApi.list({
          city: city || undefined,
          minAge: range.min ?? undefined,
          maxAge: range.max ?? undefined,
          page: nextPage,
          size: PAGE_SIZE,
        });
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
    [city, range.min, range.max, message],
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
          onPressEnter={(e) => patchParams({ city: e.target.value })}
          onChange={(e) => !e.target.value && city && patchParams({ city: '' })}
        />

        <Select
          size="large"
          style={{ minWidth: 150 }}
          value={age}
          onChange={(v) => patchParams({ age: v })}
          options={AGE_RANGES.map((r) => ({ value: r.value, label: t(r.labelKey) }))}
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
            (city || age || liveOnly) && (
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
