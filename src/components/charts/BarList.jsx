import { useState } from 'react';

/**
 * Horizontal magnitude comparison across labelled categories.
 *
 * One hue throughout: the categories are named on the axis, so colour would be
 * decoration rather than a channel. Bars cap at 18px with a 4px rounded
 * data-end squared at the baseline, the value rides the tip, and each bar is
 * its own hover target.
 */
export default function BarList({ items = [], formatValue = (v) => v, emptyText = 'No data yet' }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));

  if (!items.length) {
    return (
      <div className="muted" style={{ padding: '28px 0', textAlign: 'center', fontSize: 13 }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((item) => {
        const pct = ((Number(item.value) || 0) / max) * 100;
        const active = hover === item.key;
        return (
          <div
            key={item.key}
            onPointerEnter={() => setHover(item.key)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(item.key)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            title={`${item.label}: ${formatValue(item.value)}`}
            style={{ cursor: 'default', outline: 'none' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 13,
                marginBottom: 7,
                alignItems: 'baseline',
              }}
            >
              <span style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {item.icon}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--text)',
                  flex: 'none',
                }}
              >
                {formatValue(item.value)}
              </span>
            </div>
            <div style={{ height: 10, background: 'rgba(255,255,255,0.045)', borderRadius: 5, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(pct, 1.5)}%`,
                  height: '100%',
                  background: '#D9B46A',
                  borderRadius: '0 4px 4px 0',
                  opacity: active ? 1 : 0.82,
                  transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
                }}
              />
            </div>
            {item.sub && (
              <div className="faint" style={{ fontSize: 11.5, marginTop: 5 }}>
                {item.sub}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
